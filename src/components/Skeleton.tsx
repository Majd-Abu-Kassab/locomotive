export function Skeleton({ width, height, radius, style }: {
    width?: string | number;
    height?: string | number;
    radius?: string;
    style?: React.CSSProperties;
}) {
    return (
        <div style={{
            width: width || '100%',
            height: height || 16,
            borderRadius: radius || 'var(--radius-md)',
            background: 'linear-gradient(90deg, var(--bg-glass) 25%, rgba(255,255,255,0.06) 50%, var(--bg-glass) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s ease-in-out infinite',
            ...style,
        }} />
    );
}

export function CardSkeleton() {
    return (
        <div className="card" style={{ padding: 'var(--space-5)' }}>
            <Skeleton height={20} width="60%" style={{ marginBottom: 'var(--space-3)' }} />
            <Skeleton height={14} width="80%" style={{ marginBottom: 'var(--space-2)' }} />
            <Skeleton height={14} width="40%" style={{ marginBottom: 'var(--space-4)' }} />
            <Skeleton height={8} radius="var(--radius-full)" />
        </div>
    );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
    return (
        <tr>
            {Array(cols).fill(null).map((_, i) => (
                <td key={i}><Skeleton height={14} width={i === 0 ? '70%' : '50%'} /></td>
            ))}
        </tr>
    );
}

export function StatSkeleton() {
    return (
        <div className="stat-card">
            <Skeleton height={14} width="40%" style={{ marginBottom: 'var(--space-3)' }} />
            <Skeleton height={28} width="60%" style={{ marginBottom: 'var(--space-2)' }} />
            <Skeleton height={12} width="50%" />
        </div>
    );
}
