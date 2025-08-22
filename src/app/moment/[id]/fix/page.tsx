"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
import { useIsAdmin } from "@/lib/useIsAdmin";

const PHOTOS_BUCKET = "photos";
const COLLAGES_BUCKET = "collages";

type MomentRow = { id: string; created_by: string | null; status: string | null };

export default function FixPage() {
  const params = useParams<{ id: string }>();
  const momentId = params?.id as string;
  const router = useRouter();

  const { isAdmin } = useIsAdmin();
  const [isOwner, setIsOwner] = useState(false);
  const [items, setItems] = useState<{ name: string }[]>([]);
  const [making, setMaking] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Besitzer prüfen
  useEffect(() => {
    (async () => {
      const [{ data: session }, { data: m }] = await Promise.all([
        supabase.auth.getSession(),
        supabase.from("moments").select("id,created_by,status").eq("id", momentId).single<MomentRow>(),
      ]);
      const uid = session.session?.user?.id;
      setIsOwner(Boolean(uid && m?.created_by && uid === m.created_by));
    })();
  }, [momentId]);

  // Bilder holen
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.storage.from(PHOTOS_BUCKET).list(momentId, {
        limit: 200,
        sortBy: { column: "updated_at", order: "desc" },
      });
      if (error) setMsg("Konnte Bilder nicht laden: " + error.message);
      else setItems((data || []).filter((d) => /\.(jpe?g|png|webp)$/i.test(d.name)));
    })();
  }, [momentId]);

  const canFix = isAdmin || isOwner;

  const drawCollage = async (): Promise<HTMLCanvasElement> => {
    // einfache Grid-Collage: 3 Spalten, Kachel 600px
    const cols = 3;
    const tile = 600;
    const rows = Math.ceil(items.length / cols) || 1;

    const canvas = canvasRef.current!;
    canvas.width = cols * tile;
    canvas.height = rows * tile;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const loadImage = (src: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });

    // öffentliche URLs holen und zeichnen
    for (let i = 0; i < items.length; i++) {
      const n = items[i].name;
      const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(`${momentId}/${n}`);
      const img = await loadImage(data.publicUrl);

      const c = i % cols;
      const r = Math.floor(i / cols);

      // Bild auf Quadratkachel einpassen (contain)
      const scale = Math.min(tile / img.width, tile / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = c * tile + (tile - w) / 2;
      const y = r * tile + (tile - h) / 2;

      ctx.drawImage(img, x, y, w, h);
    }

    // kleiner Rand/Label
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "28px system-ui, sans-serif";
    ctx.fillText(`Moment: ${momentId}`, 24, canvas.height - 24);

    return canvas;
  };

  const handleFix = async () => {
    if (!canFix) return;

    try {
      setMaking(true);
      setMsg("Erzeuge Collage …");

      // 1) Collage rendern
      const canvas = await drawCollage();
      const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.9));

      // 2) Upload in collages-Bucket
      const filename = `collage-${Date.now()}.jpg`;
      const path = `${momentId}/${filename}`;
      const { error: upErr } = await supabase.storage.from(COLLAGES_BUCKET).upload(path, blob, {
        contentType: "image/jpeg",
      });
      if (upErr) throw upErr;

      // 3) Eintrag in collages-Tabelle
      const { error: dbErr } = await supabase.from("collages").insert({
        moment_id: momentId,
        jpg_path: path,
      });
      if (dbErr) throw dbErr;

      // 4) (optional) Moment auf "fixed" setzen, wenn Spalte vorhanden
      await supabase.from("moments").update({ status: "fixed" }).eq("id", momentId);

      setMsg("Collage erstellt ✅");
    } catch (e: any) {
      setMsg("Fehler: " + (e?.message || String(e)));
    } finally {
      setMaking(false);
    }
  };

  return (
    <div className="min-h-screen container py-6 space-y-4">
      <h1 className="text-2xl font-bold">Moment fixieren: {momentId}</h1>

      {!canFix && (
        <div className="rounded-xl border border-neutral-700 bg-neutral-900/60 p-3 text-sm text-neutral-300">
          Nur der Ersteller oder ein Admin kann fixieren.{" "}
          <Link href={`/moment/${momentId}`} className="underline">
            Zurück
          </Link>
        </div>
      )}

      <div className="rounded-xl border border-neutral-700 bg-neutral-900/60 p-4">
        <p className="text-sm text-neutral-300 mb-3">
          Bilder gefunden: <b>{items.length}</b>
        </p>
        <button
          onClick={handleFix}
          disabled={!canFix || making || items.length === 0}
          className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 disabled:opacity-60"
        >
          {making ? "Erzeuge …" : "Collage erzeugen & speichern"}
        </button>
        {msg && <div className="mt-3 text-sm text-neutral-300">{msg}</div>}
      </div>

      {/* Unsichtbares Canvas zum Rendern */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
