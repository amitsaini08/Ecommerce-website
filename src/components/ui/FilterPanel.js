'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Star, Filter, RotateCcw } from 'lucide-react';

export default function FilterPanel({
  minPrice = '',
  maxPrice = '',
  minRating = '',
  inStockOnly = false,
  setMinPrice,
  setMaxPrice,
  onPriceFilter,
  onRatingChange,
  onInStockChange,
  onClear,
  hasFilters = false,
}) {
  const [openSections, setOpenSections] = useState({
    price: true,
    rating: true,
    availability: true,
  });

  const [errors, setErrors] = useState({});

  const toggleSection = (section) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };


  const validatePrices = (min, max) => {
    const nextErrors = {};

    const minValue = min === '' ? null : Number(min);
    const maxValue = max === '' ? null : Number(max);

    if (minValue !== null && minValue < 0) {
      nextErrors.min_price = 'Price cannot be negative';
    }

    if (maxValue !== null && maxValue < 0) {
      nextErrors.max_price = 'Price cannot be negative';
    }

    if (
      minValue !== null &&
      maxValue !== null &&
      minValue > maxValue
    ) {
      nextErrors.min_price =
        'Minimum price cannot be greater than maximum price';
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  return (
    <div className="space-y-3 text-[11px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-warm-200">
        <h3 className="font-bold text-warm-900 flex items-center gap-2 text-[14px] uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5 text-warm-900" /> Filters
        </h3>
        {hasFilters && (
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 hover:underline cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> Clear All
          </button>
        )}
      </div>

      {/* 1. Price Range Section */}
      <div className="border-b border-warm-100 pb-3">
        <button
          type="button"
          onClick={() => toggleSection('price')}
          className="flex items-center justify-between w-full text-left py-1 font-bold text-[11px] text-warm-900 uppercase tracking-wider cursor-pointer"
        >
          <span>Price Range ($)</span>
          {openSections.price ? (
            <ChevronUp className="w-3 h-3 text-warm-500" />
          ) : (
            <ChevronDown className="w-3 h-3 text-warm-500" />
          )}
        </button>

        {openSections.price && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (onPriceFilter) onPriceFilter();
            }}
            className="mt-2 space-y-2"
          >
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="any"
                value={minPrice}
                onChange={(e) => {
                  const value = e.target.value;
                  setMinPrice?.(value);
                  validatePrices(value, maxPrice);
                }}
                placeholder="Min"
                className={`w-full px-2 py-1 border rounded-md text-[11px] text-warm-900 outline-none focus:ring-2 focus:ring-warm-900/10 
                  ${errors.min_price ? 'border-red-400 focus:border-red-500' : 'border-warm-200 focus:border-warm-900'}`}
              />
              <span className="text-warm-400 font-bold">–</span>
              <input
                type="number"
                min="0"
                step="any"
                value={maxPrice}
                onChange={(e) => {
                  const value = e.target.value;
                  setMaxPrice?.(value);
                  validatePrices(minPrice, value);
                }}
                placeholder="Max"
                className={`w-full px-2 py-1 border rounded-md text-[11px] text-warm-900 outline-none focus:ring-2 focus:ring-warm-900/10
                  ${errors.max_price ? 'border-red-400 focus:border-red-500' : 'border-warm-200 focus:border-warm-900'}`}
              />
            </div>
            <div className="space-y-1">
              {errors.min_price && (<p className="text-[10px] text-red-500">  {errors.min_price} </p>)}
              {errors.max_price && (<p className="text-[10px] text-red-500">   {errors.max_price}    </p>)}
            </div>
            <button
              type="submit"
              className="w-full py-1.5 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 transition-colors cursor-pointer"
            >
              Apply Price Filter
            </button>
          </form>
        )}
      </div>


      {/* 2. Customer Rating */}
      {onRatingChange && (
        <div className="border-b border-warm-100 pb-3">
          <button
            type="button"
            onClick={() => toggleSection('rating')}
            className="flex items-center justify-between w-full text-left py-1 font-bold text-[11px] text-warm-900 uppercase tracking-wider cursor-pointer"
          >
            <span>Customer Rating</span>

            {openSections.rating ? (
              <ChevronUp className="w-3 h-3 text-warm-500" />
            ) : (
              <ChevronDown className="w-3 h-3 text-warm-500" />
            )}
          </button>

          {openSections.rating && (
            <div className="mt-2 space-y-1">
              {[4, 3, 2].map((rating) => {
                const isSelected = minRating === rating.toString();

                return (
                  <button
                    key={rating}
                    type="button"
                    onClick={() =>
                      onRatingChange(
                        isSelected ? '' : rating.toString()
                      )
                    }
                    className={`
                group w-full flex items-center justify-between
                px-2.5 py-2 rounded-md
                text-[11px] transition-all duration-150
                cursor-pointer
                ${isSelected
                        ? 'bg-warm-900 text-white'
                        : 'text-warm-700 hover:bg-warm-50'
                      }
              `}
                  >
                    <div className="flex items-center gap-2">
                      {/* Stars */}
                      <div
                        className={`flex items-center gap-0.5 ${isSelected
                          ? 'text-amber-300'
                          : 'text-amber-400'
                          }`}
                      >
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3 h-3 ${star <= rating
                              ? 'fill-current'
                              : 'text-warm-300'
                              }`}
                          />
                        ))}
                      </div>

                      <span className="font-medium">
                        {rating} & above
                      </span>
                    </div>

                    {/* Selection indicator */}
                    <span
                      className={`
                  w-3.5 h-3.5 rounded-full border
                  flex items-center justify-center
                  transition-all
                  ${isSelected
                          ? 'border-white bg-white'
                          : 'border-warm-300 group-hover:border-warm-500'
                        }
                `}
                    >
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-warm-900" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. Stock Availability */}
      {onInStockChange && (
        <div>
          <button
            type="button"
            onClick={() => toggleSection('availability')}
            className="flex items-center justify-between w-full text-left py-1 font-bold text-[11px] text-warm-900 uppercase tracking-wider cursor-pointer"
          >
            <span>Availability</span>
            {openSections.availability ? (
              <ChevronUp className="w-3 h-3 text-warm-500" />
            ) : (
              <ChevronDown className="w-3 h-3 text-warm-500" />
            )}
          </button>

          {openSections.availability && (
            <div className="mt-2">
              <label className="flex items-center gap-2 cursor-pointer text-[11px] text-warm-800">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => onInStockChange(e.target.checked)}
                  className="accent-warm-900 w-3.5 h-3.5 rounded cursor-pointer"
                />
                <span>Include In-Stock Only</span>
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
