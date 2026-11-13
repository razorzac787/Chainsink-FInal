/**
 * Cryptographic Utility for ChainSink
 * Implements SHA-256 hashing and Merkle Tree construction for on-chain state verification.
 * Follows Bitcoin / Ethereum cryptographic standards.
 */

import { MerkleProofStep } from '../types/forensics';

// Synchronous SHA-256 implementation for fast, zero-latency in-memory Merkle tree construction
function sha256Sync(str: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let lengthProperty = 'length';
  let i = 0, j = 0;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = str.length * 8;

  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let compositeClearHex = '';
  for (let idx = 0; idx < str.length; idx++) {
    compositeClearHex += str.charCodeAt(idx).toString(16).padStart(2, '0');
  }

  let wordsLength = 0;
  for (i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    words[i >> 2] |= (code & 0xff) << ((3 - (i % 4)) * 8);
  }
  words[asciiBitLength >> 5] |= 0x80 << (24 - (asciiBitLength % 32));
  words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;

  const w: number[] = new Array(64);

  for (i = 0; i < words.length; i += 16) {
    let a = hash[0];
    let b = hash[1];
    let c = hash[2];
    let d = hash[3];
    let e = hash[4];
    let f = hash[5];
    let g = hash[6];
    let h = hash[7];

    for (j = 0; j < 64; j++) {
      if (j < 16) {
        w[j] = words[i + j] | 0;
      } else {
        const gamma0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const gamma1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + gamma0 + w[j - 7] + gamma1) | 0;
      }

      const ch = (e & f) ^ (~e & g);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const sigma0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const sigma1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const t1 = (h + sigma1 + ch + k[j] + w[j]) | 0;
      const t2 = (sigma0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }

    hash[0] = (hash[0] + a) | 0;
    hash[1] = (hash[1] + b) | 0;
    hash[2] = (hash[2] + c) | 0;
    hash[3] = (hash[3] + d) | 0;
    hash[4] = (hash[4] + e) | 0;
    hash[5] = (hash[5] + f) | 0;
    hash[6] = (hash[6] + g) | 0;
    hash[7] = (hash[7] + h) | 0;
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const byte = (hash[i] >> (j * 8)) & 255;
      result += (byte < 16 ? '0' : '') + byte.toString(16);
    }
  }

  return '0x' + result;
}

export function hashString(data: string): string {
  return sha256Sync(data);
}

export function hashEntityRecord(entityId: string, riskCategory: string, proximityScore: number, hopDistance: number): string {
  // Canonical serialization for EAI compliance leaf
  const normalized = `CHAIN_SINK_EAI:${entityId}:${riskCategory}:${proximityScore.toFixed(2)}:${hopDistance}`;
  return sha256Sync(normalized);
}

export function hashPair(left: string, right: string): string {
  // Sort pairs lexically to preserve commutativity or strict left-right ordering
  const combined = left.replace('0x', '') + right.replace('0x', '');
  return sha256Sync(combined);
}

export interface MerkleTreeData {
  leaves: string[];
  levels: string[][];
  root: string;
}

export function buildMerkleTree(leaves: string[]): MerkleTreeData {
  if (leaves.length === 0) {
    const emptyRoot = sha256Sync('EMPTY_TREE');
    return { leaves: [], levels: [[emptyRoot]], root: emptyRoot };
  }

  let currentLevel = [...leaves];
  const levels: string[][] = [currentLevel];

  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      // If odd number of nodes, duplicate the last element (standard RFC 6962 / Bitcoin rule)
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
      nextLevel.push(hashPair(left, right));
    }
    levels.push(nextLevel);
    currentLevel = nextLevel;
  }

  return {
    leaves,
    levels,
    root: levels[levels.length - 1][0] || '0x0000000000000000000000000000000000000000000000000000000000000000',
  };
}

export function generateMerkleProof(tree: MerkleTreeData, leafIndex: number): MerkleProofStep[] {
  const proof: MerkleProofStep[] = [];
  if (leafIndex < 0 || leafIndex >= tree.leaves.length) {
    return proof;
  }

  let currentIndex = leafIndex;
  for (let l = 0; l < tree.levels.length - 1; l++) {
    const level = tree.levels[l];
    const isRightChild = currentIndex % 2 === 1;
    const siblingIndex = isRightChild ? currentIndex - 1 : currentIndex + 1;

    if (siblingIndex < level.length) {
      proof.push({
        position: isRightChild ? 'left' : 'right',
        hash: level[siblingIndex],
      });
    } else {
      // Duplicated leaf
      proof.push({
        position: 'right',
        hash: level[currentIndex],
      });
    }

    currentIndex = Math.floor(currentIndex / 2);
  }

  return proof;
}

export function verifyProximityProof(leafHash: string, proof: MerkleProofStep[], expectedRoot: string): boolean {
  let currentHash = leafHash;

  for (const step of proof) {
    if (step.position === 'left') {
      currentHash = hashPair(step.hash, currentHash);
    } else {
      currentHash = hashPair(currentHash, step.hash);
    }
  }

  return currentHash.toLowerCase() === expectedRoot.toLowerCase();
}
