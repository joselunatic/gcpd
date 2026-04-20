import fs from "fs/promises";
import earcut from "earcut";

const coords = [
  0.0, 0.0,
  0.5, 7.0,
  1.3, 1.4,
  2.4, 7.2,
  3.2, 1.5,
  4.3, 7.1,
  5.0, 0.0,
];
const depth = 1.2;
const scale = 12;
const scaled = coords.map((v, index) => (index % 2 === 0 ? v * scale : v * scale));
const width = 1.0;

function normalize(vec) {
  const len = Math.hypot(...vec);
  if (!len) return [0, 0, 0];
  return vec.map((v) => v / len);
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function subtract(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function facet(normal, v1, v2, v3) {
  return `  facet normal ${normal[0]} ${normal[1]} ${normal[2]}\n    outer loop\n      vertex ${v1[0]} ${v1[1]} ${v1[2]}\n      vertex ${v2[0]} ${v2[1]} ${v2[2]}\n      vertex ${v3[0]} ${v3[1]} ${v3[2]}\n    endloop\n  endfacet\n`;
}

const triangles = earcut(scaled, null, 2);
const verticesFront = [];
const verticesBack = [];
for (let i = 0; i < scaled.length; i += 2) {
  const x = scaled[i];
  const y = scaled[i + 1];
  verticesFront.push([x, y, 0]);
  verticesBack.push([x, y, -depth]);
}

const facets = [];
const normFront = [0, 0, 1];
const normBack = [0, 0, -1];
for (let i = 0; i < triangles.length; i += 3) {
  const a = verticesFront[triangles[i]];
  const b = verticesFront[triangles[i + 1]];
  const c = verticesFront[triangles[i + 2]];
  facets.push(facet(normFront, a, b, c));
  const a2 = verticesBack[triangles[i]];
  const b2 = verticesBack[triangles[i + 1]];
  const c2 = verticesBack[triangles[i + 2]];
  facets.push(facet(normBack, c2, b2, a2));
}

const n = verticesFront.length;
for (let i = 0; i < n; i++) {
  const next = (i + 1) % n;
  const v1 = verticesFront[i];
  const v2 = verticesFront[next];
  const v3 = verticesBack[next];
  const v4 = verticesBack[i];
  const edge1 = subtract(v2, v1);
  const edge2 = subtract(v4, v1);
  const normal = normalize(cross(edge1, edge2));
  facets.push(facet(normal, v1, v2, v3));
  facets.push(facet(normal, v3, v4, v1));
}

const file = `solid w\n${facets.join("")}endsolid w\n`;
await fs.mkdir("public", { recursive: true });
await fs.writeFile("public/w.stl", file, "utf8");
console.log("Generated public/w.stl");
