"""Add this Pages origin to the legacy allowed-origin list without changing bytecode sizes.
Usage: python3 build-resource-compat.py ARCHIVE_RES.swf OUTPUT.swf
The archived resource contains the local-save credit; one obsolete Korean host
slot is reused for the requested Pages origin. Graphics and script offsets remain identical.
"""
from pathlib import Path
import hashlib
import struct
import sys
import zlib

source = Path(sys.argv[1]).read_bytes()
assert hashlib.sha256(source).hexdigest() == 'd3ac8cbea8aea6a0317d9b767d8d01673d8c34eaceb8b6c9bd034827c1ad4352'
old, new = b'http://itemimgs.naver.com', b'https://pengthu.github.io'
assert len(old) == len(new)
body = zlib.decompress(source[8:])
assert body.count(old) == 2
body = body.replace(old, new)
result = source[:8] + zlib.compress(body, 9)
assert len(body) + 8 == struct.unpack_from('<I', result, 4)[0]
Path(sys.argv[2]).write_bytes(result)
print('Changed 2 allowed-origin strings; all action lengths and offsets unchanged')
print('SHA256', hashlib.sha256(result).hexdigest())
