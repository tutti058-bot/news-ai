interface NewsGridProps {
  keyword?: string;
}

export default function NewsGrid({
  keyword,
}: NewsGridProps) {
  return <div>{keyword}</div>;
}