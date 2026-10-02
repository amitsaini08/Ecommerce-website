
export let cachedOrders = {};
export let cachedPagination = { page: 1, totalPages: 1 };
export let cachedFilters = {
  status: '',
  search: '',
  paymentStatus: '',
  paymentMethod: '',
  dateFrom: '',
  dateTo: '',
};

export function invalidateOrder(orderId) {
  for (const page of Object.keys(cachedOrders)) {
    const data = cachedOrders[page]?.data || [];
    if (data.some((o) => String(o._id || o.id) === String(orderId))) {
      delete cachedOrders[page];
    }
  }
}
