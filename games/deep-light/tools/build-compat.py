"""Preserve 4399's original assets, adopting archived local-save and Chinese font compatibility repairs.
Usage: python3 build-compat.py OFFICIAL.swf LOCAL_SAVE.swf OUTPUT.swf
Inputs are obtained from the URLs and hashes recorded in ../original/provenance.json.
"""
import hashlib
from pathlib import Path
import struct
import sys
import zlib

PATCHES = {287: 75, 644: 75, 1024: 75, 1215: 37, 1216: 37, 1225: 37, 1227: 39, 1529: 34, 2122: 59, 2132: 59, 2158: 59, 2162: 59}
EXPECTED = (
    '1fcde38411f6d6862f41679d4958c9932d4727c797282d32e13f750bced19906',
    'f52b1c6e47d4220a3c4f67467543435d9be49220c0e6c23d494e4150579181ac',
)

def decode(path):
    source = Path(path).read_bytes()
    assert source[:3] == b'CWS', 'Expected compressed SWF'
    data = b'FWS' + source[3:8] + zlib.decompress(source[8:])
    assert len(data) == struct.unpack_from('<I', data, 4)[0]
    start = 8 + (5 + (data[8] >> 3) * 4 + 7) // 8 + 4
    tags, pos = [], start
    while pos < len(data):
        first = pos
        head, = struct.unpack_from('<H', data, pos)
        pos += 2
        size = head & 63
        if size == 63:
            size, = struct.unpack_from('<I', data, pos)
            pos += 4
        tags.append((head >> 6, data[first:pos + size]))
        pos += size
    assert pos == len(data)
    return source, data[:start], tags

def main():
    official, repaired, output = sys.argv[1:]
    a, header, tags = decode(official)
    b, other_header, other = decode(repaired)
    assert (hashlib.sha256(a).hexdigest(), hashlib.sha256(b).hexdigest()) == EXPECTED
    assert len(tags) == len(other) and header[8:] == other_header[8:]
    for index, kind in PATCHES.items():
        assert tags[index][0] == other[index][0] == kind
        tags[index] = other[index]
    body = header[8:] + b''.join(tag for _, tag in tags)
    result = b'CWS' + header[3:4] + struct.pack('<I', len(body) + 8) + zlib.compress(body, 9)
    Path(output).write_bytes(result)
    _, _, verify = decode(output)
    _, _, source_tags = decode(official)
    assert all(verify[i] == tag for i, tag in enumerate(source_tags) if i not in PATCHES)
    print(f'{len(tags)} tags checked; exactly {len(PATCHES)} compatibility tags replaced')
    print(f'SHA256 {hashlib.sha256(result).hexdigest()}')

if __name__ == '__main__':
    main()
