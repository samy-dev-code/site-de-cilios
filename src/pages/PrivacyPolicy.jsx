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

export default function PrivacyPolicy() {
  return (
    <LegalPage
      title="Política de Privacidade — Mari Lash Designer"
      description="Saiba como o site da Mari Lash Designer coleta, utiliza e protege os seus dados pessoais, conforme os princípios da LGPD."
    >
      <p>Última atualização: fevereiro de 2026.</p>
      <p>
        Esta Política de Privacidade explica como o site da <strong>Mari Lash Designer</strong> trata as informações
        dos visitantes e clientes, em conformidade com os princípios da Lei Geral de Proteção de Dados (LGPD — Lei
        nº 13.709/2018).
      </p>

      <Section title="1. Quais dados coletamos">
        <p>O site coleta apenas os dados necessários para o funcionamento do agendamento e do atendimento:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Nome, para identificar você no atendimento;</li>
          <li>Número de WhatsApp, para confirmar e combinar o agendamento;</li>
          <li>Informações do agendamento (serviço, data, horário, forma de pagamento e observações que você informar).</li>
        </ul>
        <p>
          Não coletamos dados de pagamento (números de cartão ou credenciais bancárias) através do site — o pagamento
          é combinado diretamente no atendimento. Também não utilizamos cookies de publicidade ou rastreamento.
        </p>
      </Section>

      <Section title="2. Para que usamos os dados">
        <ul className="list-disc space-y-1 pl-5">
          <li>Registrar, gerenciar e confirmar o seu agendamento;</li>
          <li>Entrar em contato pelo WhatsApp sobre o horário marcado;</li>
          <li>Organizar a agenda do estúdio e o histórico de atendimentos.</li>
        </ul>
      </Section>

      <Section title="3. Armazenamento e segurança">
        <p>
          Os dados informados no agendamento ficam armazenados de forma segura em servidores do Supabase (banco de
          dados na nuvem), com controle de acesso restrito: apenas a administradora do estúdio, autenticada por senha,
          consegue visualizar a lista de agendamentos.
        </p>
      </Section>

      <Section title="4. Compartilhamento">
        <p>
          Seus dados não são vendidos nem compartilhados com terceiros para fins comerciais. A mensagem de
          agendamento é enviada pelo WhatsApp (serviço do WhatsApp LLC) contendo apenas as informações do horário
          solicitado, para que a confirmação aconteça.
        </p>
      </Section>

      <Section title="5. Seus direitos">
        <p>
          Nos termos da LGPD, você pode solicitar a qualquer momento: a confirmação de que tratamos seus dados, o
          acesso a eles, a correção de informações incompletas ou desatualizadas e a exclusão dos seus dados. Basta
          entrar em contato pelo WhatsApp do estúdio, disponível no rodapé do site.
        </p>
      </Section>

      <Section title="6. Contato">
        <p>
          Dúvidas sobre esta política ou sobre o tratamento dos seus dados podem ser enviadas pelo WhatsApp da
          Mari Lash Designer, acessível pelo botão flutuante ou pelo rodapé do site. Consulte também nossos{' '}
          <Link to="/termos-de-uso" className="text-lavender underline underline-offset-4">Termos de Uso</Link>.
        </p>
      </Section>
    </LegalPage>
  );
}
