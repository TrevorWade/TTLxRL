/**
 * LikeCounter displays the total like count without any animations.
 */
export default function LikeCounter({ totalLikes }) {
  return (
    <div className="relative flex items-center gap-4 p-4 bg-gradient-to-r from-tiktok-red/10 to-tiktok-pink/10 rounded-xl border border-tiktok-red/20 overflow-hidden">
      <div className="text-4xl">❤️</div>
      <div className="flex-1">
        <div className="text-sm text-gray-400 font-medium mb-1">Total Likes</div>
        <div
          className="text-4xl font-bold text-tiktok-red tabular-nums leading-none"
          aria-live="polite"
          aria-label={`Total likes: ${totalLikes.toLocaleString()}`}
        >
          {totalLikes.toLocaleString()}
        </div>
      </div>
    </div>
  );
}
