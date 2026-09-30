import { useState } from 'react';

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}) {
  if (totalPages <= 1) return null;

  const [pageInput, setPageInput] = useState('');

  const pages = [];
  const maxVisible = 5;

  let start = Math.max(
    1,
    currentPage - Math.floor(maxVisible / 2)
  );

  let end = Math.min(
    totalPages,
    start + maxVisible - 1
  );

  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  const handleGoToPage = () => {
    const page = Number(pageInput);

    if (!Number.isInteger(page)) return;
    if (page < 1 || page > totalPages) return;

    onPageChange(page);
    setPageInput('');
  };

  return (
    <div className="flex items-center justify-center gap-1.5">

      {/* Previous */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="px-3 py-2 text-sm font-medium text-warm-600 hover:text-warm-900 hover:bg-warm-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Previous
      </button>

      {/* First page */}
      {start > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            className="w-9 h-9 text-sm font-medium text-warm-600 hover:text-warm-900 hover:bg-warm-100 rounded-lg transition-colors"
          >
            1
          </button>

          {start > 2 && (
            <span className="text-warm-400 px-1">...</span>
          )}
        </>
      )}

      {/* Visible pages */}
      {pages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`w-9 h-9 text-sm font-medium rounded-lg transition-colors ${
            page === currentPage
              ? 'bg-warm-900 text-white'
              : 'text-warm-600 hover:text-warm-900 hover:bg-warm-100'
          }`}
        >
          {page}
        </button>
      ))}

      {/* Last page */}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && (
            <span className="text-warm-400 px-1">...</span>
          )}

          <button
            onClick={() => onPageChange(totalPages)}
            className="w-9 h-9 text-sm font-medium text-warm-600 hover:text-warm-900 hover:bg-warm-100 rounded-lg transition-colors"
          >
            {totalPages}
          </button>
        </>
      )}

      {/* Next */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="px-3 py-2 text-sm font-medium text-warm-600 hover:text-warm-900 hover:bg-warm-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Next
      </button>

      {/* Go to page */}
      <div className="flex items-center gap-1.5 ml-3">
        <input
          type="number"
          min={1}
          max={totalPages}
          value={pageInput}
          onChange={(e) => setPageInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleGoToPage();
            }
          }}
          placeholder="Page"
          className="w-16 h-9 px-2 text-sm border border-warm-200 rounded-lg outline-none focus:ring-2 focus:ring-warm-300"
        />

        <button
          onClick={handleGoToPage}
          disabled={!pageInput}
          className="h-9 px-3 text-sm font-medium bg-warm-900 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Go
        </button>
      </div>
    </div>
  );
}