type Props = {
  title: string;
  description: string;
};

export default function Placeholder({ title, description }: Props) {
  return (
    <div className="mx-auto max-w-[1180px] px-6 py-5">
      <h1 className="text-[18px] font-black tracking-tight text-slate-900">
        {title}
      </h1>
      <p className="mt-0.5 text-[13px] text-slate-500">{description}</p>
      <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50">
          <span className="text-2xl">🚧</span>
        </div>
        <h2 className="mt-4 text-[15px] font-bold text-slate-800">
          Próximamente
        </h2>
        <p className="mt-1.5 max-w-[280px] text-[13px] text-slate-500">
          Esta sección estará disponible en una próxima actualización.
        </p>
      </div>
    </div>
  );
}
