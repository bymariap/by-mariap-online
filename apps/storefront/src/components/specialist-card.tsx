import Image from "next/image";

export interface SpecialistSummary {
  id: string;
  user: { fullName: string };
  specialties: string[];
  avatarUrl: string | null;
}

export function SpecialistCard({ specialist }: { specialist: SpecialistSummary }) {
  return (
    <div
      className="bg-white rounded-xl p-6 text-center"
      style={{ boxShadow: "0 20px 40px rgba(48,51,46,0.05)" }}
    >
      <div className="h-20 w-20 rounded-full overflow-hidden bg-muted mx-auto">
        {/* TODO(asset): foto del especialista (placeholder cuando avatarUrl es null) */}
        {specialist.avatarUrl ? (
          <Image
            src={specialist.avatarUrl}
            alt={specialist.user.fullName}
            width={160}
            height={160}
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>
      <p className="font-heading text-lg text-foreground mt-4">
        {specialist.user.fullName}
      </p>
      {specialist.specialties.length > 0 && (
        <p className="text-sm font-body text-muted-foreground mt-1">
          {specialist.specialties.join(" · ")}
        </p>
      )}
    </div>
  );
}
