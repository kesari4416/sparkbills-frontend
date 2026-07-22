/**
 * BarcodeScanBar — universal barcode-scan input for the invoice / POS flow.
 *
 * A USB or Bluetooth barcode scanner emulates a keyboard: it types the code
 * into whatever field has focus and presses Enter. This component wraps a
 * single input + a green "Scan" button:
 *
 *   • Click **Scan** → the input is focused & selected, an emerald ring
 *     appears and the button flips to "Scanning…".
 *   • The user triggers the scanner (or types manually). On Enter, we look
 *     the code up in the `items` array (matching either `barcode` or `sku`)
 *     and call `onScan(item)` with the matched product.
 *   • On success the input clears and stays in scanning mode so the next
 *     scan is instant — great for adding multiple items in a row at POS.
 *   • On miss we surface a `sonner` toast and keep the value in the input
 *     so the cashier can fix / verify.
 *
 * Props:
 *   items        — array of items to search in (already tenant + industry scoped).
 *   onScan       — (item) => void, invoked when a barcode is matched.
 *   placeholder  — optional input placeholder.
 *   stayFocused  — keep the input focused after each successful scan (default true).
 */
import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScanLine } from "lucide-react";
import { toast } from "sonner";

export default function BarcodeScanBar({
  items = [],
  onScan,
  placeholder = "Scan or type barcode…",
  stayFocused = true,
}) {
  const [scanning, setScanning] = useState(false);
  const [code, setCode] = useState("");
  const inputRef = useRef(null);

  const startScan = () => {
    setScanning(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 40);
  };

  const attemptMatch = (raw) => {
    const v = (raw || "").trim();
    if (!v) return false;
    const lc = v.toLowerCase();
    const hit =
      items.find((i) => (i.barcode || "").toLowerCase() === lc) ||
      items.find((i) => (i.sku || "").toLowerCase() === lc);
    if (hit) {
      onScan?.(hit);
      setCode("");
      if (stayFocused) inputRef.current?.focus();
      return true;
    }
    toast.error(`No item found for barcode "${v}"`);
    return false;
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      attemptMatch(code);
    }
  };

  return (
    <div className="flex gap-2 items-center" data-testid="barcode-scan-bar">
      <div className="relative flex-1">
        <ScanLine
          className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
            scanning ? "text-emerald-600" : "text-muted-foreground"
          }`}
        />
        <Input
          ref={inputRef}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => setScanning(false)}
          placeholder={placeholder}
          className={`pl-9 rounded-sm font-mono text-sm h-11 transition-all ${
            scanning ? "ring-2 ring-emerald-500 border-emerald-500" : ""
          }`}
          data-testid="barcode-scan-input"
        />
      </div>
      <Button
        type="button"
        variant={scanning ? "default" : "outline"}
        className={`rounded-sm h-11 gap-2 shrink-0 ${
          scanning ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
        }`}
        onClick={startScan}
        data-testid="scan-barcode-btn"
      >
        <ScanLine className="w-4 h-4" />
        {scanning ? "Scanning…" : "Scan Barcode"}
      </Button>
    </div>
  );
}
