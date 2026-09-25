import { useCallback, useEffect, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import { ImageUp, RotateCcw, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useToast } from '../hooks/useToast';
import { assertImageFile, cropImageToDataUrl } from '../utils/image';
import { cn } from '../utils/cn';

const ASPECTS = [
  { key: 'original', label: 'Original' },
  { key: 'square', label: 'Square', ratio: '1:1', value: 1 },
  { key: 'portrait', label: 'Portrait', ratio: '4:5', value: 4 / 5 },
  { key: 'landscape', label: 'Landscape', ratio: '4:3', value: 4 / 3 },
];

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

/**
 * Crop / zoom / rotate an image. Nothing changes for the caller until Save, which
 * hands back a resized JPEG data URL (same format the regular upload produces).
 */
export function ImageEditor({ open, src, onClose, onSave }) {
  const toast = useToast();
  const inputRef = useRef(null);
  const [source, setSource] = useState(src);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspectKey, setAspectKey] = useState('original');
  const [naturalAspect, setNaturalAspect] = useState(1);
  const [area, setArea] = useState(null);
  const [saving, setSaving] = useState(false);

  const resetAdjustments = useCallback(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setAspectKey('original');
  }, []);

  useEffect(() => {
    if (!open) return;
    setSource(src);
    resetAdjustments();
  }, [open, src, resetAdjustments]);

  // Replaced images are shown from a blob URL; release it when it's no longer used.
  useEffect(() => {
    if (!source?.startsWith('blob:')) return;
    return () => URL.revokeObjectURL(source);
  }, [source]);

  function handleReplace(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      assertImageFile(file);
      setSource(URL.createObjectURL(file));
      resetAdjustments();
    } catch (err) {
      toast.error(err);
    }
  }

  async function handleSave() {
    if (!area) return;
    setSaving(true);
    try {
      onSave(await cropImageToDataUrl(source, area, rotation));
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  }

  const aspect = ASPECTS.find((a) => a.key === aspectKey)?.value ?? naturalAspect;
  const rotateBy = (deg) => setRotation((r) => ((r + deg + 540) % 360) - 180);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Edit image"
      footer={
        <>
          <Button variant="ghost" onClick={resetAdjustments} className="mr-auto">Reset</Button>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} loading={saving} disabled={!area}>Save</Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="relative h-72 overflow-hidden rounded-xl bg-neutral-100 sm:h-96">
          {source && (
            <Cropper
              image={source}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspect}
              minZoom={MIN_ZOOM}
              maxZoom={MAX_ZOOM}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={(_, pixels) => setArea(pixels)}
              onMediaLoaded={({ naturalWidth, naturalHeight }) => setNaturalAspect(naturalWidth / naturalHeight)}
            />
          )}
        </div>

        <div>
          <span className="mb-2 block text-xs font-medium tracking-wide text-neutral-500 uppercase">Crop</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {ASPECTS.map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={() => setAspectKey(a.key)}
                aria-pressed={aspectKey === a.key}
                className={cn(
                  'rounded-lg border px-3 py-2 text-sm transition-colors',
                  aspectKey === a.key
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-200 text-neutral-700 hover:border-neutral-400'
                )}
              >
                {a.label}
                {a.ratio && <span className={cn('ml-1 text-xs', aspectKey === a.key ? 'text-neutral-300' : 'text-neutral-400')}>{a.ratio}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs font-medium tracking-wide text-neutral-500 uppercase">Zoom</span>
            <span className="flex items-center gap-2 text-neutral-400">
              <ZoomOut className="size-4 shrink-0" />
              <input
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-neutral-900"
                aria-label="Zoom"
              />
              <ZoomIn className="size-4 shrink-0" />
            </span>
          </label>
          <div>
            <span className="mb-2 block text-xs font-medium tracking-wide text-neutral-500 uppercase">Rotate · {rotation}°</span>
            <span className="flex items-center gap-2">
              <button type="button" onClick={() => rotateBy(-90)} className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900" aria-label="Rotate left 90°">
                <RotateCcw className="size-4" />
              </button>
              <input
                type="range"
                min={-180}
                max={180}
                step={1}
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                className="w-full accent-neutral-900"
                aria-label="Rotation"
              />
              <button type="button" onClick={() => rotateBy(90)} className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900" aria-label="Rotate right 90°">
                <RotateCw className="size-4" />
              </button>
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3">
          <p className="text-xs text-neutral-500">Drag to position. Your current photo stays until you click Save.</p>
          <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()} className="shrink-0">
            <ImageUp className="size-4" /> Replace image
          </Button>
        </div>
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleReplace} />
      </div>
    </Modal>
  );
}
