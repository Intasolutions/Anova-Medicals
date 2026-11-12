import React from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { ArrowDown, ArrowUp, GripVertical, Trash2 } from 'lucide-react';

const inputClass = 'bg-slate-50 border-2 border-slate-100 rounded-lg outline-none focus:border-blue-500 transition-all text-xs font-bold text-slate-700';
const arrowClass = 'w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-slate-400';

const ParameterRow = ({ param, index, count, onEdit, onMove, onRemove }) => {
    const dragControls = useDragControls();
    const label = param.name || `parameter ${index + 1}`;

    return (
        <Reorder.Item
            value={param._key}
            dragListener={false}
            dragControls={dragControls}
            data-param-row={param.name}
            className="flex gap-2 items-start p-2 rounded-xl border border-slate-100 bg-white"
        >
            <div className="flex flex-col items-center flex-shrink-0">
                <button
                    type="button"
                    aria-label={`Drag ${label}`}
                    title="Drag to move"
                    onPointerDown={(event) => dragControls.start(event)}
                    style={{ touchAction: 'none' }}
                    className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-slate-600 cursor-grab active:cursor-grabbing"
                >
                    <GripVertical size={16} />
                </button>
                <span className="text-[10px] font-black text-slate-400">{index + 1}</span>
            </div>
            <input
                placeholder="e.g. Hemoglobin"
                value={param.name}
                onChange={(e) => onEdit({ name: e.target.value })}
                className={`flex-1 w-full px-3 py-1.5 h-9 ${inputClass}`}
            />
            <div className="w-[60px] flex justify-center items-center h-9">
                <input
                    type="checkbox"
                    aria-label={`${label} is a heading`}
                    checked={param.is_heading || false}
                    onChange={(e) => onEdit(e.target.checked
                        ? { is_heading: true, unit: '', normal_range: '' }
                        : { is_heading: false })}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
            </div>
            {!param.is_heading ? (
                <div className="flex gap-2 flex-1 flex-col">
                    <div className="flex gap-2 w-full">
                        <input
                            placeholder="Unit (e.g. mg/dL)"
                            value={param.unit || ''}
                            onChange={(e) => onEdit({ unit: e.target.value })}
                            className={`w-16 px-2 py-1.5 h-9 ${inputClass}`}
                        />
                        <textarea
                            placeholder="Normal Range (e.g. 12-16)"
                            value={param.normal_range || ''}
                            onChange={(e) => onEdit({ normal_range: e.target.value })}
                            className={`flex-1 min-h-[36px] px-2 py-1 ${inputClass}`}
                        />
                    </div>
                    <textarea
                        placeholder="Parameter Description / Interpretation Notes"
                        value={param.description || ''}
                        onChange={(e) => onEdit({ description: e.target.value })}
                        className={`w-full min-h-[36px] px-2 py-1 ${inputClass} text-slate-500`}
                    />
                </div>
            ) : (
                <div className="flex-1 text-xs text-slate-400 italic flex items-center px-2 h-9">Subheading only - no range/unit required</div>
            )}
            <div className="flex flex-col flex-shrink-0">
                <button type="button" aria-label={`Move ${label} up`} title="Move up" disabled={index === 0} onClick={() => onMove(-1)} className={arrowClass}>
                    <ArrowUp size={15} />
                </button>
                <button type="button" aria-label={`Move ${label} down`} title="Move down" disabled={index === count - 1} onClick={() => onMove(1)} className={arrowClass}>
                    <ArrowDown size={15} />
                </button>
            </div>
            <button
                type="button"
                aria-label={`Remove ${label}`}
                title="Remove"
                onClick={onRemove}
                className="w-8 h-9 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"
            >
                <Trash2 size={16} />
            </button>
        </Reorder.Item>
    );
};

// The test's parameters in report order. The order is saved with the test.
const ParameterListEditor = ({ parameters, onChange }) => {
    const byKey = new Map(parameters.map((param) => [param._key, param]));

    const edit = (index, changes) =>
        onChange(parameters.map((param, i) => (i === index ? { ...param, ...changes } : param)));

    const move = (index, offset) => {
        const next = [...parameters];
        const [param] = next.splice(index, 1);
        next.splice(index + offset, 0, param);
        onChange(next);
    };

    if (parameters.length === 0) {
        return (
            <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center">
                <p className="text-xs text-slate-400 font-medium">No parameters defined. This will be treated as a single test.</p>
            </div>
        );
    }

    return (
        <>
            <div className="flex gap-2 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest items-center">
                <span className="w-7"></span>
                <span className="flex-1">Parameter Name</span>
                <span className="w-[60px] text-center">Heading?</span>
                <span className="flex-1">Details</span>
                <span className="w-[68px]"></span>
            </div>
            <p className="px-2 text-[11px] text-slate-400">Drag or use the arrows to set the order they print in.</p>
            <Reorder.Group
                axis="y"
                as="div"
                layoutScroll
                values={parameters.map((param) => param._key)}
                onReorder={(keys) => onChange(keys.map((key) => byKey.get(key)))}
                className="space-y-2 max-h-[420px] overflow-y-auto pr-1"
            >
                {parameters.map((param, index) => (
                    <ParameterRow
                        key={param._key}
                        param={param}
                        index={index}
                        count={parameters.length}
                        onEdit={(changes) => edit(index, changes)}
                        onMove={(offset) => move(index, offset)}
                        onRemove={() => onChange(parameters.filter((_, i) => i !== index))}
                    />
                ))}
            </Reorder.Group>
        </>
    );
};

export default ParameterListEditor;
