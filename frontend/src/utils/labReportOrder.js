// The order lab tests appear in on reports, as arranged under Laboratory > Categories.

const UNCATEGORIZED = 'UNCATEGORIZED';

export const categoryKey = (name) => (name || '').trim().toUpperCase();

// Categories come from the API already in report order. A category with no record
// (e.g. it was deleted) goes after those, and tests with no category go last.
const buildCategoryRank = (categories) => {
    const ranks = new Map(categories.map((category, index) => [categoryKey(category.name), index]));
    return (name) => {
        const key = categoryKey(name);
        if (ranks.has(key)) return ranks.get(key);
        return !key || key === UNCATEGORIZED ? categories.length + 1 : categories.length;
    };
};

const compareCatalogEntries = (a, b, rankOf) =>
    rankOf(a.category) - rankOf(b.category)
    || categoryKey(a.category).localeCompare(categoryKey(b.category))
    || (a.display_order || 0) - (b.display_order || 0)
    || (a.name || '').localeCompare(b.name || '');

export const sortCatalogTests = (tests, categories) => {
    const rankOf = buildCategoryRank(categories);
    return [...tests].sort((a, b) => compareCatalogEntries(a, b, rankOf));
};

// Charges not found in the catalog (e.g. the test was renamed afterwards) stay in the
// order they were entered, after everything else, so they are never dropped.
export const sortChargesForReport = (charges, catalog, categories) => {
    const rankOf = buildCategoryRank(categories);
    const entryFor = (charge) => catalog.find((test) => test.name === charge.test_name) || { category: UNCATEGORIZED };
    return charges
        .map((charge) => ({ charge, entry: entryFor(charge) }))
        .sort((a, b) => compareCatalogEntries(a.entry, b.entry, rankOf))
        .map(({ charge }) => charge);
};

const hasResults = (charge) => Object.keys(charge.results || {}).length > 0;

// Names of the packages on a report, whether it holds the package row, its tests, or both.
export const packageNamesForReport = (charges, catalog) => {
    const names = new Map();
    charges.filter((charge) => charge.status !== 'CANCELLED').forEach((charge) => {
        const isPackage = catalog.find((test) => test.name === charge.test_name)?.is_package;
        const name = charge.parent_test_name || (isPackage ? charge.test_name : null);
        if (name) names.set(categoryKey(name), name.trim().replace(/\s+/g, ' '));
    });
    return [...names.values()];
};

// Returns [[categoryName, charges], ...] in report order. Cancelled tests and package
// rows are left out: a package's tests print individually under their own categories.
// A package row that holds results itself is kept, so those results are never lost.
export const groupChargesForReport = (charges, catalog, categories) => {
    const printable = charges.filter(
        (charge) => charge.status !== 'CANCELLED'
            && (hasResults(charge) || !catalog.find((test) => test.name === charge.test_name)?.is_package),
    );
    const groups = new Map();
    sortChargesForReport(printable, catalog, categories).forEach((charge) => {
        const category = catalog.find((test) => test.name === charge.test_name)?.category || UNCATEGORIZED;
        const key = categoryKey(category);
        if (!groups.has(key)) groups.set(key, [category, []]);
        groups.get(key)[1].push(charge);
    });
    return [...groups.values()];
};
