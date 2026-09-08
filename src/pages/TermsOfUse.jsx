import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import SiteFooter from '../components/SiteFooter';

function LegalPage({ title, description, children }) {
  useEffect(() => {
    document.title = title;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = description;
    return () => {
      document.title = 'Mari Lash Designer — Realce o seu olhar';
    };
  }, [title, description]);

  return (
    <div className="bg-ambient min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-16">
        <Link to="/" className="text-sm text-lavender/70 transition hover:text-lavender">← Voltar ao site</Link>
        <h1 className="mt-6 font-serif text-4xl text-gradient">{title.replace(' — Mari Lash Designer', '')}</h1>
        <div className="divider-fade mt-4 max-w-xs" />
        <div className="prose-legals mt-8 space-y-6 text-sm leading-relaxed text-plum-200/80">{children}</div>
      </div>
      <SiteFooter />
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-lavender-soft">{title}</h2>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}

export default function TermsOfUse() {
  return (
    <LegalPage
      title="Termos de Uso — Mari Lash Designer"
      description="Condições de utilização do site e do sistema de agendamento online da Mari Lash Designer — cílios e design de sobrancelhas."
    >
      <p>Última atualização: fevereiro de 2026.</p>
      <p>
        Estes Termos de Uso regulam a utilização do site da <strong>Mari Lash Designer</strong> e do seu sistema de
        agendamento online. Ao utilizar o site, você concorda com as condições descritas abaixo.
      </p>

      <Section title="1. Utilização do site">
        <p>
          O site tem caráter informativo e de agendamento. Você se compromete a utilizar o site de boa-fé, sem
          praticar ações que comprometam seu funcionamento ou que envolvam tentativas de acesso não autorizado ao
          painel administrativo.
        </p>
      </Section>

      <Section title="2. Agendamentos">
        <p>
          O agendamento é realizado pelo formulário do site e confirmado pelo WhatsApp do estúdio. O horário só é
          considerado garantido após a confirmação da administradora. A disponibilidade exibida no formulário reflete
          os horários de atendimento configurados pelo estúdio e pode mudar a qualquer momento.
        </p>
      </Section>

      <Section title="3. Responsabilidade pelas informações">
        <p>
          Você é responsável pelas informações fornecidas no agendamento (nome, WhatsApp, serviço e observações).
          Informações incorretas podem impedir a confirmação do horário.
        </p>
      </Section>

      <Section title="4. Cancelamentos e atrasos">
        <p>
          Não há cobrança automática por cancelamento pelo site. Em caso de imprevisto, pedimos a gentileza de avisar
          com antecedência pelo WhatsApp do estúdio, para que o horário possa ser oferecido a outra cliente. Em caso
          de atraso, entre em contato pelo mesmo canal para verificar a viabilidade do atendimento.
        </p>
      </Section>

      <Section title="5. Serviços, preços e formas de pagamento">
        <p>
          Os serviços, valores e formas de pagamento exibidos são gerenciados pelo estúdio e podem ser atualizados a
          qualquer momento, sem aviso prévio. O valor considerado é o confirmado no momento do agendamento. O
          pagamento é combinado diretamente no atendimento (PIX, dinheiro ou cartão), sem cobrança automática pelo
          site.
        </p>
      </Section>

      <Section title="6. Alterações destes termos">
        <p>
          Estes termos podem ser atualizados periodicamente. A versão publicada nesta página é sempre a vigente.
        </p>
      </Section>

      <Section title="7. Contato">
        <p>
          Dúvidas sobre estes termos podem ser enviadas pelo WhatsApp da Mari Lash Designer, disponível no rodapé do
          site.
        </p>
      </Section>
    </LegalPage>
  );
}
