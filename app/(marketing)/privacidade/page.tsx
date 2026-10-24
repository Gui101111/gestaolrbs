import type { Metadata } from "next";
import { LegalPage } from "@/components/landing/legal-page";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Política de Privacidade", description: `Como a ${siteConfig.name} trata dados pessoais (LGPD).` };

export default function PrivacyPage() {
  return (
    <LegalPage eyebrow="LGPD" title="Política de Privacidade" updatedAt="15 de outubro de 2026">
      <p>
        Esta Política explica como {siteConfig.legal.companyName} trata dados pessoais na plataforma {siteConfig.name}, em conformidade com a Lei
        nº 13.709/2018 (LGPD). <strong>Texto-base sujeito a revisão jurídica.</strong>
      </p>
      <h2>1. Dados tratados</h2>
      <ul>
        <li><strong>Cadastro:</strong> nome, e-mail, telefone, número da OAB, escritório e área de atuação.</li>
        <li><strong>Conteúdo:</strong> vídeos enviados, transcrições geradas, instruções de edição, identidade visual (logotipo, cores).</li>
        <li><strong>Pagamento:</strong> CPF/CNPJ e dados de cobrança, processados pelo parceiro de pagamentos. Não armazenamos dados de cartão.</li>
        <li><strong>Uso:</strong> registros de acesso e uso necessários à segurança e ao funcionamento do serviço.</li>
      </ul>
      <h2>2. Finalidades e bases legais</h2>
      <ul>
        <li>Execução do contrato: criar sua conta, processar e entregar seus vídeos, cobrar a assinatura.</li>
        <li>Legítimo interesse: segurança, prevenção a fraudes e melhoria do serviço.</li>
        <li>Consentimento: comunicações de novidades e cookies não essenciais.</li>
        <li>Cumprimento de obrigação legal: guarda de registros de acesso (Marco Civil da Internet).</li>
      </ul>
      <h2>3. Inteligência artificial e operadores</h2>
      <p>
        Para editar os vídeos, o conteúdo pode ser processado por fornecedores de infraestrutura e de inteligência artificial (por exemplo,
        transcrição e análise de conteúdo), que atuam como operadores sob contrato e apenas para essa finalidade. Seus vídeos não são usados para
        divulgação nem compartilhados com terceiros para fins próprios deles.
      </p>
      <h2>4. Armazenamento e segurança</h2>
      <ul>
        <li>Arquivos ficam em armazenamento privado, acessíveis somente por links temporários e assinados.</li>
        <li>O acesso aos dados é isolado por usuário (Row Level Security) e protegido por autenticação.</li>
      </ul>
      <h2>5. Seus direitos</h2>
      <p>
        Você pode solicitar confirmação, acesso, correção, portabilidade, anonimização ou eliminação dos dados, além de revogar consentimentos. A
        exclusão da conta pode ser feita diretamente em Perfil e remove dados e arquivos de forma definitiva.
      </p>
      <h2>6. Cookies</h2>
      <p>Usamos cookies essenciais para autenticação e segurança. Cookies de desempenho só são usados com sua permissão.</p>
      <h2>7. Encarregado (DPO)</h2>
      <p>Contato: {siteConfig.legal.dpoEmail}</p>
    </LegalPage>
  );
}
