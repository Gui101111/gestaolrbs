import type { Metadata } from "next";
import { LegalPage } from "@/components/landing/legal-page";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Termos de Uso", description: `Termos de Uso da plataforma ${siteConfig.name}.` };

export default function TermsPage() {
  return (
    <LegalPage eyebrow="Legal" title="Termos de Uso" updatedAt="15 de outubro de 2026">
      <p>
        Estes Termos regulam o uso da plataforma {siteConfig.name}, mantida por {siteConfig.legal.companyName} (“nós”). Ao criar uma conta, você
        (“usuário”) declara ter lido e concordado com estas condições. <strong>Texto-base sujeito a revisão jurídica.</strong>
      </p>
      <h2>1. O serviço</h2>
      <p>
        A {siteConfig.name} é uma ferramenta de criação e edição de vídeos. O usuário envia gravações próprias, escolhe preferências de edição e
        recebe arquivos editados. A plataforma não presta serviços advocatícios, não realiza captação de clientela e não garante resultados de
        qualquer natureza decorrentes da publicação dos vídeos.
      </p>
      <h2>2. Conta e acesso</h2>
      <ul>
        <li>O cadastro exige dados verdadeiros e confirmação de e-mail. O acesso é pessoal e intransferível.</li>
        <li>Você é responsável por manter a confidencialidade da sua senha e pelas ações realizadas na sua conta.</li>
      </ul>
      <h2>3. Conteúdo do usuário e responsabilidade profissional</h2>
      <ul>
        <li>Você declara possuir os direitos de uso de imagem, voz e conteúdo dos vídeos enviados.</li>
        <li>
          O conteúdo é de responsabilidade exclusiva do usuário, inclusive quanto à observância do Código de Ética e Disciplina da OAB e do
          Provimento 205/2021. A revisão de conformidade oferecida pela plataforma é auxiliar e não substitui a análise do profissional.
        </li>
        <li>Concedemos a nós apenas a licença necessária para processar, armazenar e entregar os vídeos editados a você.</li>
      </ul>
      <h2>4. Planos, pagamentos e cancelamento</h2>
      <ul>
        <li>As assinaturas são mensais e renovadas automaticamente, com cobrança por cartão de crédito ou Pix por meio de parceiro de pagamentos.</li>
        <li>Os limites de cada plano (vídeos, minutos, ajustes, resolução e armazenamento) são exibidos na página de assinatura.</li>
        <li>O cancelamento pode ser feito a qualquer momento e o acesso permanece até o fim do ciclo pago.</li>
      </ul>
      <h2>5. Disponibilidade</h2>
      <p>Empregamos esforços razoáveis para manter o serviço disponível, podendo haver interrupções para manutenção ou por fatores externos.</p>
      <h2>6. Encerramento</h2>
      <p>Você pode excluir sua conta a qualquer momento em Perfil. Podemos suspender contas que violem estes Termos ou a legislação.</p>
      <h2>7. Foro</h2>
      <p>Aplica-se a legislação brasileira. Fica eleito o foro do domicílio do usuário consumidor, quando aplicável.</p>
      <h2>Contato</h2>
      <p>Dúvidas: {siteConfig.contact.email}</p>
    </LegalPage>
  );
}
