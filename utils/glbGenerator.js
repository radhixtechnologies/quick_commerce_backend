const https = require('https');
const http = require('http');

/**
 * Fetches an image URL (or decodes a data:image base64 URI) into a raw Buffer + mimeType.
 */
function fetchImageBuffer(imageUrl, redirects = 0) {
  return new Promise((resolve) => {
    if (!imageUrl || typeof imageUrl !== 'string') return resolve(null);

    if (imageUrl.startsWith('data:image/')) {
      try {
        const m = imageUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/s);
        if (!m) return resolve(null);
        return resolve({ buffer: Buffer.from(m[2], 'base64'), mimeType: m[1] === 'image/jpg' ? 'image/jpeg' : m[1] });
      } catch (_) {
        return resolve(null);
      }
    }

    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      return resolve(null);
    }

    const lib = imageUrl.startsWith('https://') ? https : http;
    const req = lib.get(
      imageUrl,
      { headers: { 'User-Agent': 'Xwayu3DStudio/1.0 (https://quick-commerce-backend-a3f7.onrender.com)' } },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects < 4) {
          return resolve(fetchImageBuffer(res.headers.location, redirects + 1));
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return resolve(null);
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          const ct = (res.headers['content-type'] || 'image/jpeg').split(';')[0].trim().toLowerCase();
          const mimeType = ct.includes('png') ? 'image/png' : 'image/jpeg';
          resolve(buf.length > 100 ? { buffer: buf, mimeType } : null);
        });
      }
    );
    req.on('error', () => resolve(null));
    req.setTimeout(8000, () => {
      req.destroy();
      resolve(null);
    });
  });
}

/**
 * Generates a valid Binary glTF 2.0 (.glb) 3D model featuring:
 * - Front & Back 3D textured product faces mapped with the exact product image
 * - Thick 3D metallic golden rim/sides connecting the front & back faces
 */
function buildProductGlb(imageBuffer, mimeType = 'image/jpeg') {
  const w = 0.85; // half-width
  const h = 0.85; // half-height
  const d = 0.08; // half-depth (0.16 total 3D thickness)

  // 24 vertices (4 per face of 3D slab: Front, Back, Top, Bottom, Right, Left)
  const positions = new Float32Array([
    // Front face (+Z)
    -w, -h,  d,   w, -h,  d,   w,  h,  d,  -w,  h,  d,
    // Back face (-Z)
     w, -h, -d,  -w, -h, -d,  -w,  h, -d,   w,  h, -d,
    // Top rim (+Y)
    -w,  h,  d,   w,  h,  d,   w,  h, -d,  -w,  h, -d,
    // Bottom rim (-Y)
    -w, -h, -d,   w, -h, -d,   w, -h,  d,  -w, -h,  d,
    // Right rim (+X)
     w, -h,  d,   w, -h, -d,   w,  h, -d,   w,  h,  d,
    // Left rim (-X)
    -w, -h, -d,  -w, -h,  d,  -w,  h,  d,  -w,  h, -d
  ]);

  const normals = new Float32Array([
    0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,
    0, 0,-1,  0, 0,-1,  0, 0,-1,  0, 0,-1,
    0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,
    0,-1, 0,  0,-1, 0,  0,-1, 0,  0,-1, 0,
    1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
   -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0
  ]);

  // Note: glTF UV (0,0) is top-left for images
  const uvs = new Float32Array([
    // Front face
    0, 1,  1, 1,  1, 0,  0, 0,
    // Back face
    0, 1,  1, 1,  1, 0,  0, 0,
    // Rim faces
    0, 1,  1, 1,  1, 0,  0, 0,
    0, 1,  1, 1,  1, 0,  0, 0,
    0, 1,  1, 1,  1, 0,  0, 0,
    0, 1,  1, 1,  1, 0,  0, 0
  ]);

  // Primitive 0: Front & Back textured faces (12 indices)
  const faceIndices = new Uint16Array([
    0, 1, 2,  0, 2, 3,
    4, 5, 6,  4, 6, 7
  ]);

  // Primitive 1: Golden metallic 3D rim/sides (24 indices)
  const rimIndices = new Uint16Array([
     8,  9, 10,   8, 10, 11,
    12, 13, 14,  12, 14, 15,
    16, 17, 18,  16, 18, 19,
    20, 21, 22,  20, 22, 23
  ]);

  const posBuf = Buffer.from(positions.buffer);
  const normBuf = Buffer.from(normals.buffer);
  const uvBuf = Buffer.from(uvs.buffer);
  const faceIdxBuf = Buffer.from(faceIndices.buffer);
  const rimIdxBuf = Buffer.from(rimIndices.buffer);

  const pad4 = (len) => (4 - (len % 4)) % 4;

  // Assemble BIN chunk with 4-byte alignment per bufferView
  const parts = [];
  let offset = 0;
  const addPart = (buf) => {
    const start = offset;
    parts.push(buf);
    offset += buf.length;
    const pad = pad4(buf.length);
    if (pad > 0) {
      parts.push(Buffer.alloc(pad, 0));
      offset += pad;
    }
    return { byteOffset: start, byteLength: buf.length };
  };

  const posView = addPart(posBuf);
  const normView = addPart(normBuf);
  const uvView = addPart(uvBuf);
  const faceIdxView = addPart(faceIdxBuf);
  const rimIdxView = addPart(rimIdxBuf);
  const imgView = imageBuffer ? addPart(imageBuffer) : null;

  const binBuffer = Buffer.concat(parts);

  const gltf = {
    asset: { version: '2.0', generator: 'Xwayu-3D-Studio' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [
      {
        primitives: [
          {
            attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 },
            indices: 3,
            material: 0
          },
          {
            attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 },
            indices: 4,
            material: 1
          }
        ]
      }
    ],
    materials: [
      {
        name: 'ProductImageFace',
        pbrMetallicRoughness: {
          ...(imgView ? { baseColorTexture: { index: 0 } } : { baseColorFactor: [0.98, 0.95, 0.9, 1.0] }),
          metallicFactor: 0.05,
          roughnessFactor: 0.45
        }
      },
      {
        name: 'Golden3DRim',
        pbrMetallicRoughness: {
          baseColorFactor: [0.96, 0.72, 0.16, 1.0],
          metallicFactor: 0.88,
          roughnessFactor: 0.22
        }
      }
    ],
    buffers: [{ byteLength: binBuffer.length }],
    bufferViews: [
      { buffer: 0, ...posView, target: 34962 },
      { buffer: 0, ...normView, target: 34962 },
      { buffer: 0, ...uvView, target: 34962 },
      { buffer: 0, ...faceIdxView, target: 34963 },
      { buffer: 0, ...rimIdxView, target: 34963 },
      ...(imgView ? [{ buffer: 0, ...imgView }] : [])
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 24, type: 'VEC3', min: [-w, -h, -d], max: [w, h, d] },
      { bufferView: 1, componentType: 5126, count: 24, type: 'VEC3' },
      { bufferView: 2, componentType: 5126, count: 24, type: 'VEC2' },
      { bufferView: 3, componentType: 5123, count: 12, type: 'SCALAR' },
      { buffer: 0, componentType: 5123, count: 24, type: 'SCALAR' } // fixed below
    ]
  };
  gltf.accessors[4] = { bufferView: 4, componentType: 5123, count: 24, type: 'SCALAR' };

  if (imgView) {
    gltf.images = [{ bufferView: 5, mimeType }];
    gltf.samplers = [{ magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }];
    gltf.textures = [{ sampler: 0, source: 0 }];
  }

  let jsonStr = JSON.stringify(gltf);
  const jsonPad = pad4(Buffer.byteLength(jsonStr, 'utf8'));
  if (jsonPad > 0) jsonStr += ' '.repeat(jsonPad);
  const jsonBuf = Buffer.from(jsonStr, 'utf8');

  const totalLength = 12 + 8 + jsonBuf.length + 8 + binBuffer.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); // 'glTF'
  header.writeUInt32LE(2, 4);          // version 2
  header.writeUInt32LE(totalLength, 8);

  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonBuf.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4); // 'JSON'

  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binBuffer.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4); // 'BIN\0'

  return Buffer.concat([header, jsonHeader, jsonBuf, binHeader, binBuffer]);
}

module.exports = { fetchImageBuffer, buildProductGlb };
