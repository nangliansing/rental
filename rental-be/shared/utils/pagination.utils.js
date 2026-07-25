// shared/utils/pagination.utils.js
export const normalizePagination = (pagination, page, limit) => {
    if (!Array.isArray(pagination)) {
        return {
            page,
            limit,
            total: pagination?.total ?? 0,
        };
    }

    return {
        page,
        limit,
        total: pagination[0]?.total ?? 0,
    };
};