#!/usr/bin/env python3
"""Make Home support details read-only, without changing login or privacy links."""
from pathlib import Path
import re

assets = Path("app/src/main/assets")
html = assets / "index.html"
source = html.read_text()
start = source.index('<div class="box contact contact-priority">', source.index('<section id="view-home">'))
end = source.index('<div class="box account-summary"', start)
contact = source[start:end]
assert contact.count("<a ") == 4, "Unexpected Home contact markup"
contact = re.sub(r'<a\b[^>]*data-i18n="phoneCall"[^>]*>[^<]*</a>', "", contact, count=1)
contact = contact.replace('<a class="contact-highlight" href="https://wa.me/12367021555" data-open-link="https://wa.me/12367021555">', '<span class="contact-info contact-highlight">')
contact = contact.replace('<a href="mailto:company@alftechsolutions.com" data-open-link="mailto:company@alftechsolutions.com">', '<span class="contact-info">')
contact = contact.replace('<a id="website" href="https://www.alftechsolutions.com/">', '<span class="contact-info">')
contact = contact.replace("</a>", "</span>")
assert contact.count('class="contact-info') == 3 and "<a " not in contact
source = source[:start] + contact + source[end:]
old_badge = '<span class="chip">✦ ASPLAYER 5.7.1</span>'
assert source.count(old_badge) == 1
source = source.replace(old_badge, "", 1)
# Retain original appearance and mobile sizing; the new spans have no focus or link behavior.
source = source.replace(".contact a{", ".contact .contact-info{")
source = source.replace(".contact-priority a{", ".contact-priority .contact-info{")
source = source.replace(".contact-priority a:focus,.login-contact a:focus", ".login-contact a:focus")
html.write_text(source)

app = assets / "app.js"
js = app.read_text()
legacy_handler = next(line for line in js.splitlines() if line.startswith("$('website').addEventListener"))
assert 'a[href^="tel:"]' in legacy_handler
js = js.replace(legacy_handler + "\n", "", 1)
app.write_text(js)
print("Home contact is static; obsolete hero version removed")
