import re

with open("index.html", "r", encoding="utf-8") as f:
    content = f.read()

pattern = r'<section class="premium-hero">[\s\S]*?</section>\s*'
new_content = re.sub(pattern, '', content, count=1)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(new_content)

print("Removed duplicated hero section from index.html")
