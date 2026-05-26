import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Política de tratamiento de datos',
};

export default function HabeasDataPage() {
  return (
    <div className="container py-12 max-w-3xl">
      <h1 className="font-heading text-3xl font-semibold text-foreground mb-2">
        Política de tratamiento de datos personales
      </h1>
      <p className="text-sm font-body text-muted-foreground mb-10">
        Versión 1.0 — vigente desde enero de 2025
      </p>

      <div className="space-y-8 font-body text-sm text-foreground leading-relaxed">
        <Section title="1. Responsable del tratamiento">
          <p>
            <strong>By MariaP</strong> (en adelante &ldquo;la Empresa&rdquo;), con domicilio en
            Medellín, Colombia, es responsable del tratamiento de los datos
            personales recopilados a través de este sitio web y durante la
            prestación de sus servicios.
          </p>
          <p className="mt-2">
            Contacto:{' '}
            <a
              href="mailto:contacto@bymariap.com"
              className="underline text-accent"
            >
              contacto@bymariap.com
            </a>
          </p>
        </Section>

        <Section title="2. Finalidades del tratamiento">
          <ul className="list-disc pl-5 space-y-1">
            <li>Procesar y gestionar pedidos de productos.</li>
            <li>
              Enviar confirmaciones de compra y actualizaciones del estado del
              pedido.
            </li>
            <li>Brindar atención al cliente.</li>
            <li>Cumplir obligaciones legales y tributarias.</li>
            <li>Mejorar la experiencia de usuario en la plataforma.</li>
          </ul>
        </Section>

        <Section title="3. Datos recopilados">
          <p>
            Recopilamos: nombre completo, dirección de correo electrónico,
            número de teléfono, dirección de envío, e información de la
            transacción (referencia de pago, monto).
          </p>
        </Section>

        <Section title="4. Derechos del titular">
          <p>
            De acuerdo con la Ley 1581 de 2012 y el Decreto 1377 de 2013, usted
            tiene derecho a:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Conocer, actualizar y rectificar sus datos personales.</li>
            <li>Solicitar prueba de la autorización otorgada.</li>
            <li>Revocar la autorización y/o solicitar la supresión del dato.</li>
            <li>
              Presentar quejas ante la Superintendencia de Industria y Comercio.
            </li>
          </ul>
        </Section>

        <Section title="5. Procedimiento para ejercer sus derechos">
          <p>
            Puede ejercer sus derechos enviando una solicitud a{' '}
            <a
              href="mailto:contacto@bymariap.com"
              className="underline text-accent"
            >
              contacto@bymariap.com
            </a>{' '}
            con asunto &ldquo;Datos personales&rdquo;. Responderemos en un plazo máximo
            de 10 días hábiles.
          </p>
        </Section>

        <Section title="6. Vigencia">
          <p>
            Esta política estará vigente a partir de su publicación. La Empresa
            se reserva el derecho de actualizarla. Las modificaciones serán
            publicadas en este mismo sitio.
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h2 className="font-heading text-lg font-semibold text-foreground">
        {title}
      </h2>
      <div className="text-muted-foreground">{children}</div>
    </div>
  );
}
