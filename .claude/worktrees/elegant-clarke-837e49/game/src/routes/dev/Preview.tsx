import { useState } from "react";

interface Device {
  label: string;
  width: number;
  height: number;
  radius: number;
  notch?: boolean;
}

const DEVICES: Device[] = [
  { label: "iPhone 15", width: 393, height: 852, radius: 48, notch: true },
  { label: "iPhone SE", width: 375, height: 667, radius: 16 },
  { label: "Pixel 8", width: 412, height: 915, radius: 40 },
  { label: "iPad mini", width: 744, height: 1133, radius: 24 },
];

const STARTING_PATHS = ["/", "/shop", "/collection", "/gacha", "/mystery", "/favorites"];

export function DevPreview() {
  if (!import.meta.env.DEV) {
    return <div className="p-6">Preview is DEV only.</div>;
  }

  const [path, setPath] = useState("/");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [scale, setScale] = useState(0.7);

  return (
    <div className="min-h-dvh bg-slate-900 text-white p-4">
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="font-pixel text-sm text-pachi-yellow">DEVICE PREVIEW</h1>
        <span className="text-xs text-white/50">同じアプリをスマホサイズで並べて表示</span>
      </header>

      <div className="flex flex-wrap gap-3 items-end mb-5 text-xs">
        <label className="flex flex-col gap-1">
          <span className="text-white/60">起点パス</span>
          <select
            value={path}
            onChange={(e) => setPath(e.target.value)}
            className="bg-slate-800 px-2 py-2 border border-white/20"
          >
            {STARTING_PATHS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-white/60">向き</span>
          <select
            value={orientation}
            onChange={(e) => setOrientation(e.target.value as "portrait" | "landscape")}
            className="bg-slate-800 px-2 py-2 border border-white/20"
          >
            <option value="portrait">縦</option>
            <option value="landscape">横</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-white/60">拡大率: {Math.round(scale * 100)}%</span>
          <input
            type="range"
            min={30}
            max={100}
            step={5}
            value={Math.round(scale * 100)}
            onChange={(e) => setScale(Number(e.target.value) / 100)}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-8 justify-center">
        {DEVICES.map((d) => (
          <DeviceFrame
            key={d.label}
            device={d}
            path={path}
            orientation={orientation}
            scale={scale}
          />
        ))}
      </div>
    </div>
  );
}

function DeviceFrame({
  device,
  path,
  orientation,
  scale,
}: {
  device: Device;
  path: string;
  orientation: "portrait" | "landscape";
  scale: number;
}) {
  const portrait = orientation === "portrait";
  const w = portrait ? device.width : device.height;
  const h = portrait ? device.height : device.width;

  return (
    <div className="flex flex-col items-center">
      <div
        className="bg-black p-2 relative shadow-2xl"
        style={{
          width: w * scale + 16,
          height: h * scale + 16,
          borderRadius: device.radius * scale + 8,
        }}
      >
        {device.notch && portrait && (
          <div
            className="absolute left-1/2 -translate-x-1/2 top-2 bg-black z-10 rounded-b-2xl"
            style={{
              width: 110 * scale,
              height: 28 * scale,
            }}
          />
        )}
        <div
          className="bg-bg-base overflow-hidden"
          style={{
            width: w,
            height: h,
            borderRadius: device.radius,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <iframe
            src={path}
            title={device.label}
            className="w-full h-full border-0 block"
          />
        </div>
      </div>
      <p className="mt-2 text-xs text-white/70">
        {device.label}{" "}
        <span className="text-white/40">
          {portrait ? `${device.width}×${device.height}` : `${device.height}×${device.width}`}
        </span>
      </p>
    </div>
  );
}
