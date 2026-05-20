import { useState, useRef, useEffect } from 'react';
import { useChildren, Child } from '../../hooks/use-children';
import { useChildStore } from '../../stores/child.store';
import { useAuthStore } from '../../stores/auth.store';

function calculateAge(birthDate: string): string {
  const birth = new Date(birthDate);
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();
  if (years < 1) {
    return `${Math.max(0, months + (years * 12))}개월`;
  }
  return `${years}세`;
}

export function ChildSwitcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();
  const { data: children } = useChildren(user?.familyId);
  const { selectedChildId, setSelectedChild } = useChildStore();

  const selectedChild = children?.find((c: Child) => c.id === selectedChildId);

  useEffect(() => {
    if (children && children.length > 0 && !selectedChildId) {
      setSelectedChild(children[0].id);
    }
  }, [children, selectedChildId, setSelectedChild]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!children || children.length === 0) {
    return null;
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 transition-colors text-sm"
      >
        <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">
          {selectedChild?.name.charAt(0) || '?'}
        </div>
        <span className="font-medium text-neutral-700 max-w-[100px] truncate">
          {selectedChild?.name || '아이 선택'}
        </span>
        {selectedChild && (
          <span className="text-xs text-neutral-400">
            {calculateAge(selectedChild.birthDate)}
          </span>
        )}
        <svg
          className={`w-4 h-4 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 w-56 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-50 animate-[fadeIn_0.15s_ease-out]">
          <div className="px-3 py-2 border-b border-neutral-100">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
              아이 선택
            </p>
          </div>
          {children.map((child: Child) => (
            <button
              key={child.id}
              onClick={() => {
                setSelectedChild(child.id);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-50 transition-colors ${
                child.id === selectedChildId ? 'bg-primary-50' : ''
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  child.id === selectedChildId
                    ? 'bg-primary-500 text-white'
                    : 'bg-neutral-100 text-neutral-600'
                }`}
              >
                {child.name.charAt(0)}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-neutral-700">
                  {child.name}
                </p>
                <p className="text-xs text-neutral-400">
                  {calculateAge(child.birthDate)}
                </p>
              </div>
              {child.id === selectedChildId && (
                <svg
                  className="w-4 h-4 text-primary-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
