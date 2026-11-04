import React, { useMemo, useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { ArrowDown, ArrowUp, GripVertical, RotateCcw, Save, Trash2 } from 'lucide-react';
import api from '../api/axios';
import { categoryKey, sortCatalogTests } from '../utils/labReportOrder';

const sameOrder = (a, b) => a.length === b.length && a.every((id, index) => id === b[index]);

// Applies an unsaved order to the current rows. Rows added since the order was
// changed have no position yet, so they stay at the end.
const applyDraft = (rows, draftIds) => {
    if (!draftIds) return rows;
    const positions = new Map(draftIds.map((id, index) => [id, index]));
    const positionOf = (row) => (positions.has(row.id) ? positions.get(row.id) : draftIds.length);
    return [...rows].sort((a, b) => positionOf(a) - positionOf(b));
};

const moved = (ids, index, offset) => {
    const next = [...ids];
    const [id] = next.splice(index, 1);
    next.splice(index + offset, 0, id);
    return next;
};

const OrderRow = ({ id, label, index, count, selected, onSelect, onMove, children }) => {
    const dragControls = useDragControls();
    const arrowClass = 'p-1 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-slate-400';

    return (
        <Reorder.Item
            value={id}
            dragListener={false}
            dragControls={dragControls}
            data-order-row={label}
            onClick={onSelect}
            className={`flex items-center gap-2 px-3 py-2.5 mb-2 rounded-xl border bg-white select-none ${onSelect ? 'cursor-pointer' : ''} ${selected ? 'border-purple-400 ring-1 ring-purple-200' : 'border-slate-200 hover:border-slate-300'}`}
        >
            <button
                type="button"
                aria-label={`Drag ${label}`}
                title="Drag to move"
                onPointerDown={(event) => dragControls.start(event)}
                onClick={(event) => event.stopPropagation()}
                style={{ touchAction: 'none' }}
                className="p-1 text-slate-300 hover:text-slate-600 cursor-grab active:cursor-grabbing"
            >
                <GripVertical size={16} />
            </button>
            <span className="w-6 text-center text-xs font-black text-slate-400">{index + 1}</span>
            <span className="flex-1 min-w-0 text-sm font-bold text-slate-900 truncate">{label}</span>
            {children}
            <button
                type="button"
                aria-label={`Move ${label} up`}
                title="Move up"
                disabled={index === 0}
                onClick={(event) => { event.stopPropagation(); onMove(-1); }}
                className={arrowClass}
            >
                <ArrowUp size={16} />
            </button>
            <button
                type="button"
                aria-label={`Move ${label} down`}
                title="Move down"
                disabled={index === count - 1}
                onClick={(event) => { event.stopPropagation(); onMove(1); }}
                className={arrowClass}
            >
                <ArrowDown size={16} />
            </button>
        </Reorder.Item>
    );
};

const LabOrderManager = ({ categories, labTests, onSaved, onDeleteCategory, showToast }) => {
    const [draftCategoryIds, setDraftCategoryIds] = useState(null);
    const [draftTestIds, setDraftTestIds] = useState({});
    const [selectedKey, setSelectedKey] = useState(null);
    const [saving, setSaving] = useState(false);

    const savedTests = useMemo(() => {
        const byCategory = new Map();
        sortCatalogTests(labTests, categories).forEach((test) => {
            const key = categoryKey(test.category);
            if (!byCategory.has(key)) byCategory.set(key, []);
            byCategory.get(key).push(test);
        });
        return byCategory;
    }, [labTests, categories]);

    const orderedCategories = applyDraft(categories, draftCategoryIds);
    const orderedCategoryIds = orderedCategories.map((category) => category.id);
    const recordedKeys = new Set(categories.map((category) => categoryKey(category.name)));
    // Tests can point at a category that was since deleted. Their order can still be set.
    const unrecordedKeys = [...savedTests.keys()].filter((key) => !recordedKeys.has(key));

    const activeKey = selectedKey && (recordedKeys.has(selectedKey) || savedTests.has(selectedKey))
        ? selectedKey
        : categoryKey(orderedCategories[0]?.name);
    const savedForActive = savedTests.get(activeKey) || [];
    const orderedTests = applyDraft(savedForActive, draftTestIds[activeKey]);
    const orderedTestIds = orderedTests.map((test) => test.id);
    const testsById = new Map(orderedTests.map((test) => [test.id, test]));
    const categoriesById = new Map(categories.map((category) => [category.id, category]));

    const categoriesChanged = !sameOrder(orderedCategoryIds, categories.map((category) => category.id));
    const changedTestKeys = Object.keys(draftTestIds).filter((key) => {
        const saved = savedTests.get(key) || [];
        return !sameOrder(applyDraft(saved, draftTestIds[key]).map((test) => test.id), saved.map((test) => test.id));
    });
    const hasChanges = categoriesChanged || changedTestKeys.length > 0;

    const setTestOrder = (ids) => setDraftTestIds((drafts) => ({ ...drafts, [activeKey]: ids }));

    const discard = () => {
        setDraftCategoryIds(null);
        setDraftTestIds({});
    };

    const save = async () => {
        setSaving(true);
        try {
            if (categoriesChanged) {
                await api.post('lab/categories/reorder/', { ids: orderedCategoryIds });
            }
            for (const key of changedTestKeys) {
                const ids = applyDraft(savedTests.get(key), draftTestIds[key]).map((test) => test.id);
                await api.post('lab/tests/reorder/', { category: key, ids });
            }
            await onSaved();
            discard();
            showToast('success', 'Report order saved');
        } catch (err) {
            // Reload so the lists are current. Unsaved moves stay in place to retry.
            await onSaved();
            showToast('error', err.response?.data?.error || 'Failed to save the report order');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full min-h-0">
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-100">
                <p className="text-xs font-medium text-slate-500">
                    Drag a row or use the arrows to set the order tests print on lab reports. Select a category to arrange its tests.
                </p>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={discard}
                        disabled={!hasChanges || saving}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                    >
                        <RotateCcw size={14} /> Discard
                    </button>
                    <button
                        type="button"
                        onClick={save}
                        disabled={!hasChanges || saving}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-40"
                    >
                        <Save size={14} /> {saving ? 'Saving...' : 'Save order'}
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-6 p-6 overflow-auto md:overflow-hidden">
                <section className="flex flex-col min-h-0">
                    <h4 className="mb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categories</h4>
                    <Reorder.Group
                        axis="y"
                        layoutScroll
                        values={orderedCategoryIds}
                        onReorder={setDraftCategoryIds}
                        className="flex-1 min-h-0 overflow-y-auto pr-1"
                    >
                        {orderedCategoryIds.map((id, index) => {
                            const category = categoriesById.get(id);
                            const key = categoryKey(category.name);
                            return (
                                <OrderRow
                                    key={id}
                                    id={id}
                                    label={category.name}
                                    index={index}
                                    count={orderedCategoryIds.length}
                                    selected={key === activeKey}
                                    onSelect={() => setSelectedKey(key)}
                                    onMove={(offset) => setDraftCategoryIds(moved(orderedCategoryIds, index, offset))}
                                >
                                    <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
                                        {(savedTests.get(key) || []).length} tests
                                    </span>
                                    <button
                                        type="button"
                                        aria-label={`Delete ${category.name}`}
                                        title="Delete"
                                        onClick={(event) => { event.stopPropagation(); onDeleteCategory(id); }}
                                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </OrderRow>
                            );
                        })}
                    </Reorder.Group>
                    {unrecordedKeys.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                            <p className="mb-2 text-[10px] font-bold text-slate-400">Not in the category list (these print after all the others):</p>
                            {unrecordedKeys.map((key) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setSelectedKey(key)}
                                    className={`block w-full mb-1 px-3 py-2 rounded-lg border text-left text-xs font-bold ${key === activeKey ? 'border-purple-400 text-slate-900' : 'border-slate-200 text-slate-500'}`}
                                >
                                    {key || 'UNCATEGORIZED'}
                                </button>
                            ))}
                        </div>
                    )}
                </section>

                <section className="flex flex-col min-h-0">
                    <h4 className="mb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Tests in {activeKey || 'category'}
                    </h4>
                    {orderedTestIds.length === 0 ? (
                        <p className="p-6 text-xs font-medium text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                            No tests in this category yet.
                        </p>
                    ) : (
                        <Reorder.Group
                            key={activeKey}
                            axis="y"
                            layoutScroll
                            values={orderedTestIds}
                            onReorder={setTestOrder}
                            className="flex-1 min-h-0 overflow-y-auto pr-1"
                        >
                            {orderedTestIds.map((id, index) => (
                                <OrderRow
                                    key={id}
                                    id={id}
                                    label={testsById.get(id).name}
                                    index={index}
                                    count={orderedTestIds.length}
                                    onMove={(offset) => setTestOrder(moved(orderedTestIds, index, offset))}
                                >
                                    {testsById.get(id).is_package && (
                                        <span
                                            title="A package's tests print under their own categories"
                                            className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-[9px] font-bold"
                                        >
                                            PACKAGE
                                        </span>
                                    )}
                                </OrderRow>
                            ))}
                        </Reorder.Group>
                    )}
                </section>
            </div>
        </div>
    );
};

export default LabOrderManager;
