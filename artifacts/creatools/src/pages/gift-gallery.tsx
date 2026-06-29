import { useState, useMemo } from "react";
import { useGetGiftCatalog, getGetGiftCatalogQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search, Diamond, SortAsc, SortDesc } from "lucide-react";

type SortKey = "diamondCount" | "name" | "valueUsd";
type SortDir = "asc" | "desc";

const PRICE_TIERS = [
  { label: "All", min: 0, max: Infinity },
  { label: "Free–100", min: 0, max: 100 },
  { label: "101–1 000", min: 101, max: 1000 },
  { label: "1 001–10 000", min: 1001, max: 10000 },
  { label: "10 000+", min: 10001, max: Infinity },
];

export default function GiftGallery() {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("diamondCount");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const { data: gifts, isLoading } = useGetGiftCatalog({
    query: { queryKey: getGetGiftCatalogQueryKey(), staleTime: 1000 * 60 * 60 },
  });

  const filtered = useMemo(() => {
    if (!gifts) return [];
    const tier = PRICE_TIERS[tierFilter];
    return gifts
      .filter((g) => {
        const matchSearch = g.name.toLowerCase().includes(search.toLowerCase());
        const matchTier = g.diamondCount >= tier.min && g.diamondCount <= tier.max;
        return matchSearch && matchTier;
      })
      .sort((a, b) => {
        const mul = sortDir === "asc" ? 1 : -1;
        if (sortKey === "name") return mul * a.name.localeCompare(b.name);
        return mul * (a[sortKey] - b[sortKey]);
      });
  }, [gifts, search, tierFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "asc");
    }
  };

  const SortIcon = sortDir === "asc" ? SortAsc : SortDesc;

  function diamondColor(count: number) {
    if (count === 0) return "text-muted-foreground";
    if (count <= 100) return "text-cyan-400";
    if (count <= 1000) return "text-green-400";
    if (count <= 10000) return "text-violet-400";
    return "text-yellow-400";
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Diamond className="w-7 h-7 text-yellow-400" />
          Gift Gallery
        </h1>
        <p className="text-muted-foreground mt-1">All known TikTok LIVE gifts with diamond costs and USD values</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search gifts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border font-mono text-sm"
          />
        </div>

        {/* Price tier filter */}
        <div className="flex items-center gap-1 flex-wrap">
          {PRICE_TIERS.map((t, i) => (
            <button
              key={t.label}
              onClick={() => setTierFilter(i)}
              className={`text-xs px-2.5 py-1.5 rounded font-mono transition-colors ${
                tierFilter === i
                  ? "bg-primary/20 text-primary border border-primary/40"
                  : "text-muted-foreground hover:text-foreground border border-transparent"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Sort buttons */}
        <div className="flex items-center gap-1">
          {(["diamondCount", "valueUsd", "name"] as SortKey[]).map((key) => (
            <button
              key={key}
              onClick={() => toggleSort(key)}
              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded font-mono transition-colors ${
                sortKey === key
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {key === "diamondCount" ? "💎" : key === "valueUsd" ? "$" : "A–Z"}
              {sortKey === key && <SortIcon className="w-3 h-3" />}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      {!isLoading && gifts && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
          <span>Showing <span className="text-foreground font-semibold">{filtered.length}</span> of {gifts.length} gifts</span>
          {filtered.length > 0 && (
            <>
              <span>·</span>
              <span>
                Cheapest: <span className="text-cyan-400">{filtered.reduce((a, b) => a.diamondCount < b.diamondCount ? a : b).diamondCount.toLocaleString()} 💎</span>
              </span>
              <span>·</span>
              <span>
                Most expensive: <span className="text-yellow-400">{filtered.reduce((a, b) => a.diamondCount > b.diamondCount ? a : b).diamondCount.toLocaleString()} 💎</span>
              </span>
            </>
          )}
        </div>
      )}

      {/* Gift grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {isLoading
          ? Array(24).fill(0).map((_, i) => (
              <Card key={i} className="bg-card border-border">
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <Skeleton className="w-14 h-14 rounded-xl" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-12" />
                </CardContent>
              </Card>
            ))
          : filtered.length === 0
          ? (
            <div className="col-span-full py-16 text-center text-muted-foreground border border-border border-dashed rounded-lg">
              No gifts match your search.
            </div>
          )
          : filtered.map((gift) => (
              <Card
                key={gift.id}
                className="bg-card border-border hover:border-primary/40 transition-all hover:scale-105 group cursor-default"
              >
                <CardContent className="p-3 flex flex-col items-center gap-2 text-center">
                  <div className="w-14 h-14 flex items-center justify-center rounded-xl bg-muted/30 group-hover:bg-muted/50 transition-colors">
                    <img
                      src={gift.iconUrl}
                      alt={gift.name}
                      className="w-11 h-11 object-contain drop-shadow"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                  <div className="w-full">
                    <p className="text-xs font-medium text-foreground leading-tight truncate" title={gift.name}>
                      {gift.name}
                    </p>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <Diamond className={`w-2.5 h-2.5 shrink-0 ${diamondColor(gift.diamondCount)}`} />
                      <span className={`text-xs font-mono font-bold ${diamondColor(gift.diamondCount)}`}>
                        {gift.diamondCount.toLocaleString()}
                      </span>
                    </div>
                    {gift.valueUsd > 0 && (
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        ${gift.valueUsd.toFixed(2)}
                      </p>
                    )}
                  </div>
                  {gift.diamondCount >= 10000 && (
                    <Badge variant="outline" className="text-xs border-yellow-400/40 text-yellow-400 px-1.5 py-0">
                      Rare
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))
        }
      </div>
    </div>
  );
}
