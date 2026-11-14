"""Construit dist/musee-expeditions.html : une page unique et autonome (styles, scripts, logo intégrés).
Usage : python3 tools/build-single.py"""
import base64, re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text(encoding='utf-8')
def datauri(path, mime):
    return 'data:%s;base64,%s' % (mime, base64.b64encode((root / path).read_bytes()).decode())
icons = {
    'icons/logo.svg': datauri('icons/logo.svg', 'image/svg+xml'),
    'icons/logotype.svg': datauri('icons/logotype.svg', 'image/svg+xml'),
    'icons/icon-192.png': datauri('icons/icon-192.png', 'image/png'),
    'icons/favicon-32.png': datauri('icons/favicon-32.png', 'image/png'),
    'icons/apple-touch-icon.png': datauri('icons/apple-touch-icon.png', 'image/png'),
}
# pas de manifeste ni de service worker dans la version page unique
html = re.sub(r'\s*<link rel="manifest"[^>]*>', '', html)
css = (root / 'css/style.css').read_text(encoding='utf-8')
html = html.replace('<link rel="stylesheet" href="css/style.css">', '<style>\n' + css + '\n</style>')
def inline_js(m):
    src = (root / m.group(1)).read_text(encoding='utf-8')
    for k, v in icons.items(): src = src.replace(k, v)
    assert '</script' not in src.lower(), m.group(1)
    return '<script>\n' + src + '\n</script>'
html = html.replace('<script src="js/core.js"></script>', '<script>window.ME_SINGLE_FILE = true;</script>\n<script src="js/core.js"></script>')
html = re.sub(r'<script src="(js/[a-z0-9]+\.js)"></script>', inline_js, html)
for k, v in icons.items(): html = html.replace('"' + k + '"', '"' + v + '"')
assert 'src="js/' not in html and 'href="css/' not in html and 'icons/' not in html
(root / 'dist').mkdir(exist_ok=True)
(root / 'dist/musee-expeditions.html').write_text(html, encoding='utf-8')
print('dist/musee-expeditions.html', len(html.encode()) // 1024, 'Ko')
