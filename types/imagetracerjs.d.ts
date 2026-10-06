// imagetracerjs ships no types — only what lib/logo-trace.ts uses of it.
declare module "imagetracerjs" {
  type Rgba = { r: number; g: number; b: number; a: number };
  type TracedSegment = { type: "L" | "Q"; x1: number; y1: number; x2: number; y2: number; x3?: number; y3?: number };
  type TracedPath = {
    segments: TracedSegment[];
    /** [minX, minY, maxX, maxY] in pixels. */
    boundingbox: [number, number, number, number];
    /** Indices, in the same layer, of the holes in this path. */
    holechildren: number[];
    isholepath: boolean;
  };
  type TraceData = { layers: TracedPath[][]; palette: Rgba[]; width: number; height: number };
  type ImageLike = { width: number; height: number; data: Uint8ClampedArray };
  const ImageTracer: {
    imagedataToTracedata(imgd: ImageLike, options?: Record<string, unknown>): TraceData;
  };
  export default ImageTracer;
}
