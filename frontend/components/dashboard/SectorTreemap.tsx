import dynamic from 'next/dynamic';
import { treemapData } from '@/lib/mockData';

const ResponsiveContainer = dynamic(
  () => import('recharts').then(m => m.ResponsiveContainer),
  { ssr: false }
);
const Treemap = dynamic(
  () => import('recharts').then(m => m.Treemap),
  { ssr: false }
);

function changeColor(change: number): string {
  if (change >= 3)   return '#991b1b';
  if (change >= 1.5) return '#dc2626';
  if (change >= 0)   return '#b45309';
  if (change >= -1.5) return '#1d4ed8';
  return '#1e40af';
}

function CustomContent(props: any) {
  const { x, y, width, height, name, change } = props;
  if (!width || !height) return null;
  const color = changeColor(change ?? 0);
  const showText = width > 50 && height > 30;
  const showChange = width > 55 && height > 45;

  return (
    <g>
      <rect
        x={x + 1} y={y + 1}
        width={width - 2} height={height - 2}
        fill={color}
        rx={3}
      />
      {showText && (
        <text
          x={x + width / 2}
          y={y + height / 2 - (showChange ? 7 : 0)}
          textAnchor="middle"
          fill="white"
          fontSize={Math.min(12, width / 6)}
          fontWeight="600"
        >
          {name}
        </text>
      )}
      {showChange && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 10}
          textAnchor="middle"
          fill="rgba(255,255,255,0.85)"
          fontSize={Math.min(11, width / 7)}
        >
          {(change ?? 0) > 0 ? '+' : ''}{(change ?? 0).toFixed(1)}%
        </text>
      )}
    </g>
  );
}

// Recharts Treemap needs flat data with 'root' parent
function flattenForTreemap() {
  return treemapData.map(sector => ({
    name: sector.name,
    children: sector.children.map(item => ({
      name: item.name,
      size: item.size,
      change: item.change,
    })),
  }));
}

export default function SectorTreemap() {
  return (
    <div className="w-full h-72 bg-gray-900 rounded-xl overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={flattenForTreemap()}
          dataKey="size"
          aspectRatio={4 / 3}
          stroke="none"
          content={<CustomContent />}
        />
      </ResponsiveContainer>
    </div>
  );
}
