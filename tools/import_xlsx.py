# -*- coding: utf-8 -*-
"""Nhập dữ liệu từ N1_On_tap_40_ngay.xlsx vào data/*.js của web.

Chạy:  python tools/import_xlsx.py [đường_dẫn_xlsx]
Cần:   pip install openpyxl ; Node.js (để đọc dữ liệu cũ trong data/*.js)

- Thứ tự mục theo Excel (đã xếp theo độ quan trọng), thêm trường d = ngày học.
- Mục đã có trong web nhưng không có trong Excel được giữ lại ở cuối danh sách.
- Mục trùng: lấy nội dung Excel, giữ các trường Excel không có (ví dụ e/ev, cấu trúc s…).
"""
import json, os, re, subprocess, sys
import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XLSX = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'N1_On_tap_40_ngay.xlsx')
DATA = os.path.join(ROOT, 'data')


def load_js(name, var):
    path = os.path.join(DATA, name)
    if not os.path.exists(path):
        return []
    code = f"global.window={{}};require({json.dumps(path)});process.stdout.write(JSON.stringify(window.{var}||[]))"
    out = subprocess.run(['node', '-e', code], capture_output=True, check=True)
    return json.loads(out.stdout.decode('utf-8'))


def s(v):
    if v is None:
        return ''
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    return str(v).strip()


def rows(ws):
    return [r for r in ws.iter_rows(min_row=2, values_only=True) if r and r[0] is not None]


JP = re.compile(r'[぀-ヿ一-鿿]')
VI = re.compile(r'[a-zA-ZÀ-ỹ]')
hira2kata = lambda t: ''.join(chr(ord(c) + 0x60) if 'ぁ' <= c <= 'ゖ' else c for c in t)
norm_p = lambda p: p.replace('〜', '～').strip()


def write_js(name, header, var, items):
    lines = [header, f'window.{var} = [']
    lines.append(',\n'.join('  ' + json.dumps(x, ensure_ascii=False) for x in items))
    lines.append('];\n')
    with open(os.path.join(DATA, name), 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(lines))


def merge(new, old, key):
    """new/old: list dict. Trả về danh sách new (bổ sung trường từ old) + old còn thừa."""
    old_by = {o[key]: o for o in old}
    out, used = [], set()
    for n in new:
        o = old_by.get(n[key])
        if o:
            used.add(n[key])
            for k, v in o.items():
                if k not in n or n[k] in ('', None, []):
                    n[k] = v
        out.append(n)
    out += [o for o in old if o[key] not in used and o[key] not in {n[key] for n in new}]
    return out


def clean(d):
    return {k: v for k, v in d.items() if v not in ('', None, [])}


wb = openpyxl.load_workbook(XLSX, data_only=True)
sheet = lambda prefix: next(ws for ws in wb if ws.title.startswith(prefix))

# ---------- Từ vựng ----------
vocab = []
for r in rows(sheet('800')):
    _, day, w, rd, hv, m, typ, n_ans, n_opt, exams = r[:10]
    vocab.append(clean({'w': s(w), 'r': s(rd), 'hv': s(hv), 'm': s(m), 't': s(typ), 'x': s(exams), 'd': int(day)}))
vocab = merge(vocab, load_js('vocab.js', 'VOCAB'), 'w')

# ---------- Kanji ----------
EX = re.compile(r'^(.+?)[(（]\s*(.+?)\s*[:：]\s*(.+?)\s*[)）]$')
kanji = []
for r in rows(sheet('500')):
    _, day, k, hv, m, on, kun, ex = r[:8]
    exs = []
    for part in re.split(r'[;；]', s(ex)):
        part = part.strip()
        mt = EX.match(part)
        if mt:
            exs.append([mt.group(1).strip(), mt.group(2), mt.group(3)])
        elif part:
            exs.append([part, '', ''])
    kanji.append({'k': s(k), 'hv': s(hv), 'on': hira2kata(s(on)).replace(',', '、'),
                  'kun': s(kun).replace(',', '、'), 'm': s(m), 'ex': exs, 'd': int(day)})
kanji = merge(kanji, load_js('kanji.js', 'KANJI'), 'k')

# ---------- Ngữ pháp ----------
FIX_M = {'～かたがた': lambda m: m.replace('仕事が終わらないから、帰ろうにも帰れない。 ', '')}


def make_blank(p, e):
    """Tạo câu hỏi điền chỗ trống: thay phần mẫu ngữ pháp trong câu ví dụ bằng ＿＿."""
    base = re.sub(r'[（(][^）)]*[）)]', '', p)
    cands = set()
    for c in re.split(r'[～〜/／・\s]+', base):
        c = c.strip()
        cands |= {c, re.sub(r'(だ|です)$', '', c), re.sub(r'^[たて]', '', c) if len(c) > 3 else c}
    cands = {c for c in cands if len(c) >= 2}
    for c in sorted(cands, key=len, reverse=True):
        if c in e:
            return e.replace(c, '＿＿', 1), c
    return None, None


grammar = []
for r in rows(sheet('100')):
    _, day, p, m, e, ev, n_ok, n_dis, src = r[:9]
    p, m, e, ev = norm_p(s(p)), s(m), s(e), s(ev)
    if ev and JP.search(ev) and not re.search(r'[À-ỹ]', ev):  # câu ví dụ bị tách sang cột Dịch
        e, ev = e + ev, ''
    m = FIX_M.get(p, lambda x: x)(m)
    grammar.append(clean({'p': p, 'm': m, 'e': e, 'ev': ev, 'd': int(day), 'src': s(src)}))

old_g = {g['p']: g for g in load_js('grammar.js', 'GRAMMAR')}
for g in grammar:
    o = old_g.get(g['p'])
    if not g.get('e') and o:  # Excel không có ví dụ → dùng ví dụ cũ
        g['e'], g['ev'] = o.get('e', ''), o.get('ev', '')
    q, a = make_blank(g['p'], g.get('e', ''))
    if q:
        g['q'], g['a'] = q, a
    elif o and o.get('q'):
        g['q'], g['a'] = o['q'], o['a']
grammar = merge(grammar, list(old_g.values()), 'p')

# ---------- Lộ trình 40 ngày ----------
plan = []
for r in rows(sheet('Lộ trình')):
    day, week, typ, _, v, k, g, rev, prac, time = r[:10]
    plan.append(clean({'d': int(day), 'w': int(week), 'type': s(typ), 'v': s(v), 'k': s(k), 'g': s(g),
                       'rev': s(rev), 'prac': s(prac), 'time': s(time)}))
guide = [s(r[0]) for r in sheet('Cách chọn').iter_rows(values_only=True)]

write_js('vocab.js', '// Từ vựng N1 — w (từ), r (cách đọc), hv (Hán Việt), m (nghĩa), t (loại từ), x (đã ra trong đề), d (ngày học theo lộ trình 40 ngày), e/ev (ví dụ, dịch)\n'
         '// Sinh tự động từ N1_On_tap_40_ngay.xlsx bằng tools/import_xlsx.py — sửa Excel rồi chạy lại script.', 'VOCAB', vocab)
write_js('kanji.js', '// Kanji N1 — k (chữ), hv (Hán Việt), on (âm On), kun (âm Kun), m (nghĩa), ex ([từ, cách đọc, nghĩa]), d (ngày học)\n'
         '// Sinh tự động từ N1_On_tap_40_ngay.xlsx bằng tools/import_xlsx.py.', 'KANJI', kanji)
write_js('grammar.js', '// Ngữ pháp N1 — p (mẫu), m (nghĩa), s (cấu trúc), e (ví dụ), ev (dịch), x (ví dụ bổ sung [câu, dịch]), q (câu có chỗ trống ＿＿), a (đáp án), d (ngày học), src (nguồn)\n'
         '// Sinh tự động từ N1_On_tap_40_ngay.xlsx bằng tools/import_xlsx.py.', 'GRAMMAR', grammar)
with open(os.path.join(DATA, 'plan.js'), 'w', encoding='utf-8', newline='\n') as f:
    f.write('// Lộ trình 40 ngày — sinh tự động từ N1_On_tap_40_ngay.xlsx bằng tools/import_xlsx.py\n')
    f.write('window.PLAN = ' + json.dumps(plan, ensure_ascii=False, indent=1) + ';\n')
    f.write('window.PLAN_GUIDE = ' + json.dumps(guide, ensure_ascii=False, indent=1) + ';\n')

print(f'vocab {len(vocab)} | kanji {len(kanji)} | grammar {len(grammar)} (có câu hỏi: {sum(1 for g in grammar if g.get("q"))}) | plan {len(plan)} ngày')
