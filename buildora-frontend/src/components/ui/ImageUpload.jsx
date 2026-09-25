import { useRef, useState } from 'react';
import { Crop, ImagePlus, ImageUp, LoaderCircle, Trash2 } from 'lucide-react';
import { fileToResizedDataUrl } from '../../utils/image';
import { useToast } from '../../hooks/useToast';
import { cn } from '../../utils/cn';

// `onEdit` (wide shape only) adds Edit/Replace actions below the image.
export function ImageUpload({ label, value, onChange, maxSize = 1000, shape = 'square', hint, onEdit }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      onChange(await fileToResizedDataUrl(file, { maxSize }));
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  }

  const box = shape === 'wide' ? 'aspect-[4/3] w-full' : 'size-24';

  return (
    <div className="space-y-1.5">
      {label && <span className="block text-sm font-medium text-neutral-700">{label}</span>}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            box,
            'group relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-neutral-400 transition-colors hover:border-brand-500 hover:text-brand-600'
          )}
        >
          {value ? (
            <img src={value} alt="" className={cn('size-full', onEdit ? 'object-contain' : 'object-cover')} />
          ) : busy ? (
            <LoaderCircle className="size-6 animate-spin" />
          ) : (
            <span className="flex flex-col items-center gap-1 text-xs">
              <ImagePlus className="size-6" />
              Upload
            </span>
          )}
        </button>
        {shape !== 'wide' && (
          <div className="space-y-2 text-xs text-neutral-500">
            <p>{hint || 'PNG or JPG. Resized automatically.'}</p>
            {value && (
              <button type="button" onClick={() => onChange('')} className="inline-flex items-center gap-1 text-red-600 hover:underline">
                <Trash2 className="size-3.5" /> Remove
              </button>
            )}
          </div>
        )}
      </div>
      {shape === 'wide' && value && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
          {onEdit && (
            <>
              <button type="button" onClick={onEdit} className="inline-flex items-center gap-1 text-xs font-medium text-neutral-800 hover:underline">
                <Crop className="size-3.5" /> Edit image
              </button>
              <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-1 text-xs font-medium text-neutral-800 hover:underline">
                <ImageUp className="size-3.5" /> Replace image
              </button>
            </>
          )}
          <button type="button" onClick={() => onChange('')} className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline">
            <Trash2 className="size-3.5" /> Remove image
          </button>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFile} />
    </div>
  );
}
