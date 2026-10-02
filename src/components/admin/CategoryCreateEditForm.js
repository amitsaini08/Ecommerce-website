import { categoriesApi } from '@/lib/apiClient/categories';

export function CategoryCreateEditForm({ category, onClose, onSaved }) {
  const toast = useToast();
  const editingId = category?._id || category?.id || null;

  const [form, setForm] = useState({
    imageUrl: category?.imageUrl || '',
    parentIds: category?.parentIds || [],
  });
  const [saving, setSaving] = useState(false);
  const [invalidParentIds, setInvalidParentIds] = useState(new Set());

  const { register, setValue, formState: { errors }, handleSubmit } = useForm({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: category?.name || '', slug: category?.slug || '' },
  });


  useEffect(() => {
    if (!editingId) return;
    const controller = new AbortController();
    categoriesApi.getDescendants(editingId, { signal: controller.signal })
      .then((d) => setInvalidParentIds(new Set(d?.descendantIds || [])))
      .catch(() => { });
    return () => controller.abort();
  }, [editingId]);

  const excludeIds = useMemo(
    () => new Set([editingId, ...invalidParentIds].filter(Boolean)),
    [editingId, invalidParentIds]
  );

  async function onSubmit(data) {
    setSaving(true);
    try {
      const payload = { ...data, imageUrl: form.imageUrl, parentIds: form.parentIds || [] };
      await categoriesApi.save(editingId, payload);
      toast.success(editingId ? 'Category updated!' : 'Category created!');
      onSaved(); // parent: form band + tree refresh
      return;
    } catch (err) {
      toast.error(
        err.message?.includes('cycle')
          ? 'This category list may be out of date — please refresh and try again.'
          : err.message || 'Failed'
      );
    }
    setSaving(false);
  }

  const handleSlugChange = (e) => {
    setValue('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''), {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-md bg-white border border-warm-200 rounded-md shadow-xl p-4 space-y-3 animate-fadeIn"
      >
        <div className="flex items-center justify-between border-b border-warm-100 pb-2">
          <h3 className="font-bold text-warm-900 text-[13px]">
            {editingId ? 'Edit Category' : 'Create New Category'}
          </h3>
          <button type="button" onClick={onClose} className="p-1 text-warm-400 hover:text-warm-900 rounded-md">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-warm-700 mb-1">Category Name *</label>
            <input
              type="text"
              {...register('name', {
                onChange: (e) => {
                  if (!editingId) setValue('slug', slugify(e.target.value), { shouldValidate: true });
                },
              })}
              placeholder="e.g. Footwear"
              className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 focus:outline-none focus:border-brand-600"
            />
            {errors.name && <span className="text-[11px] text-red-600">{errors.name.message}</span>}
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-warm-700 mb-1">URL Slug *</label>
            <input
              type="text"
              {...register('slug', { onChange: handleSlugChange })}
              placeholder="footwear"
              className="w-full px-2.5 py-1.5 bg-white border border-warm-200 rounded-md text-[11px] text-warm-900 font-mono focus:outline-none focus:border-brand-600"
            />
            {errors.slug && <span className="text-[11px] text-red-600">{errors.slug.message}</span>}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="block text-[10px] font-semibold text-warm-700 mb-1">Parent Category</label>
          <CategoryTreeSelect
            value={form.parentIds}
            onChange={(ids) => setForm((f) => ({ ...f, parentIds: ids }))}
            excludeIds={excludeIds}
            placeholder="Select parent categories..."
          />
        </div>

        <div>
          <ImageUpload
            uploadType="category-image"
            value={form.imageUrl ? [form.imageUrl] : []}
            onChange={(urls) =>
              setForm((f) => ({ ...f, imageUrl: Array.isArray(urls) ? urls[0] || '' : urls }))
            }
            multiple={false}
            label="Category Cover Image"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1.5 border-t border-warm-100">

          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="dark" loading={saving}>
            <span>{editingId ? 'Update Category' : 'Save Category'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}