'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import './PdfViewer.css';

/**
 * Shows a lesson PDF by drawing its pages right on the page with Mozilla's
 * PDF.js, instead of the browser's PDF viewer. That works on every device
 * (phones can't show a PDF inside a page; they offer to download it) and has
 * no download or print buttons, so whether students can download is decided
 * by the lesson's own Download button. Pages are drawn as they scroll into view.
 */
export default function PdfViewer({ url, title }: { url: string; title: string }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        let cancelled = false;
        let loading: { destroy: () => Promise<void> } | null = null;
        let observer: IntersectionObserver | null = null;

        const drawPage = async (pdf: PDFDocumentProxy, n: number, slot: HTMLElement) => {
            const page = await pdf.getPage(n);
            const base = page.getViewport({ scale: 1 });
            slot.style.aspectRatio = `${base.width} / ${base.height}`;
            // Sharp on high-density screens, capped so big pages don't eat memory.
            const scale = (slot.clientWidth / base.width) * Math.min(window.devicePixelRatio || 1, 2);
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement('canvas');
            canvas.width = Math.floor(viewport.width);
            canvas.height = Math.floor(viewport.height);
            await page.render({ canvas, viewport }).promise;
            if (!cancelled) slot.replaceChildren(canvas);
        };

        (async () => {
            const pdfjs = await import('pdfjs-dist');
            pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
            const task = pdfjs.getDocument({ url });
            loading = task;
            const pdf = await task.promise;
            if (cancelled) return;

            // One placeholder per page, sized like page 1 until drawn.
            const first = (await pdf.getPage(1)).getViewport({ scale: 1 });
            const slots = Array.from({ length: pdf.numPages }, (_, i) => {
                const slot = document.createElement('div');
                slot.className = 'pdf-page';
                slot.dataset.page = String(i + 1);
                slot.style.aspectRatio = `${first.width} / ${first.height}`;
                slot.setAttribute('aria-label', `Page ${i + 1} of ${pdf.numPages}`);
                return slot;
            });
            container.replaceChildren(...slots);

            observer = new IntersectionObserver(entries => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue;
                    observer?.unobserve(entry.target);
                    const slot = entry.target as HTMLElement;
                    drawPage(pdf, Number(slot.dataset.page), slot).catch(err => console.error('PDF page render error:', err));
                }
            }, { root: container, rootMargin: '800px 0px' });
            slots.forEach(s => observer!.observe(s));
            setStatus('ready');
        })().catch(err => {
            if (cancelled) return;
            console.error('PDF load error:', err);
            setStatus('error');
        });

        return () => {
            cancelled = true;
            observer?.disconnect();
            loading?.destroy();
        };
    }, [url]);

    return (
        <div className="pdf-viewer" role="document" aria-label={title}>
            {status !== 'ready' && (
                <div className="pdf-viewer-status">
                    {status === 'error'
                        ? <><AlertTriangle size={18} style={{ color: 'var(--color-warning)' }} /> Couldn’t open this PDF. Refresh the page to try again.</>
                        : <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />}
                </div>
            )}
            {/* Pages are added here by PDF.js, outside React. No right-click
                "Save image as" on the drawn pages. */}
            <div ref={containerRef} className="pdf-viewer-pages" onContextMenu={e => e.preventDefault()} />
        </div>
    );
}
