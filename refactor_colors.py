import os
import re

mappings = [
    # Emerald to primary
    (re.compile(r'emerald-500'), 'primary'),
    (re.compile(r'emerald-400'), 'primary'),
    
    # #5ec998 to primary
    (re.compile(r'\[#5ec998\]'), 'primary'),
    
    # #0d4a2f to darkprimary
    (re.compile(r'\[#0d4a2f\]'), 'darkprimary'),
    
    # shadow-[#082b1c] -> shadow-primary/25 (special case)
    (re.compile(r'shadow-\[#082b1c\](?!\/)'), 'shadow-primary/25'),
    
    # General [#082b1c] to primary
    (re.compile(r'\[#082b1c\]'), 'primary'),
    
    # RGB variant of #082b1c (8, 43, 28) -> new primary (5, 138, 197)
    (re.compile(r'rgba\(8,\s*43,\s*28'), 'rgba(5, 138, 197'),
    
    # Hardcoded hex in JS/TS if it was #082b1c
    (re.compile(r'#082b1c'), '#058AC5'),
]

def refactor_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        return False
    
    new_content = content
    for pattern, replacement in mappings:
        new_content = pattern.sub(replacement, new_content)
    
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

def main():
    src_dir = 'src'
    modified_files = []
    for root, dirs, files in os.walk(src_dir):
        if 'node_modules' in dirs:
            dirs.remove('node_modules')
        for file in files:
            if file.endswith(('.tsx', '.ts', '.css', '.js', '.mjs')):
                file_path = os.path.join(root, file)
                if refactor_file(file_path):
                    modified_files.append(file_path)
    
    print(f"Modified {len(modified_files)} files.")
    for f in modified_files:
        print(f" - {f}")

if __name__ == "__main__":
    main()
