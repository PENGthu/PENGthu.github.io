"""Check deployable SWF assets, scene references, hashes, and Ruffle files."""
from pathlib import Path
import hashlib
import json
import re
import struct
import zlib

root = Path(__file__).resolve().parents[1]
original = root / 'original'
manifest = json.loads((original / 'provenance.json').read_text())
for entry in manifest['assets']:
    data = (original / entry['path']).read_bytes()
    assert len(data) == entry['bytes'], entry['path']
    assert hashlib.sha256(data).hexdigest() == entry['sha256'], entry['path']
    assert data[:3] in (b'CWS', b'FWS'), entry['path']
    body = zlib.decompress(data[8:]) if data[:3] == b'CWS' else data[8:]
    assert len(body) + 8 == struct.unpack_from('<I', data, 4)[0], entry['path']
resources = (original / 'game/lang/FSADIGBOY_RES.swf').read_bytes()
xml = zlib.decompress(resources[8:])
scenes = set(s.decode() for s in re.findall(rb'<map mapfile="([^"]+)" scene="true">', xml))
# The two optional scenes and endings are referenced by GameMain directly.
scenes |= {'quest5', 'quest6', 'ending_happy', 'ending_not'}
for scene in scenes:
    assert (original / f'game/ogoon_{scene}.swf').is_file(), scene
runtime = json.loads((root / 'ruffle/package.json').read_text())
assert runtime['version'] == '0.6.0'
for path in (root / 'ruffle').glob('*.js'):
    content = path.read_text()
    for wasm in re.findall(r'[0-9a-f]{20}\.wasm', content):
        assert (path.parent / wasm).is_file(), wasm
assert len(scenes) == 13
print(f"Verified {len(manifest['assets'])} original SWF files, all {len(scenes)} external story/ending scenes, and Ruffle {runtime['version']}.")
