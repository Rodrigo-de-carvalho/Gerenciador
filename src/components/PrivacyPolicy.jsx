import { X, Shield } from 'lucide-react';

export default function PrivacyPolicy({ onClose }) {
  return (
    <div className="modal-overlay" style={{ zIndex: 70 }}>
      <div className="modal-box" style={{ maxWidth: 520 }}>
        <div className="modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={15} style={{ color: 'var(--text-3)' }} />
            <h2>Política de Privacidade</h2>
          </div>
          {onClose && (
            <button className="icon-btn" onClick={onClose}><X size={15} /></button>
          )}
        </div>

        <div style={{ overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 20, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.65 }}>
          <p style={{ fontSize: 11.5, color: 'var(--text-4)', margin: 0 }}>Última atualização: maio de 2025</p>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h3 style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', margin: 0 }}>1. Dados que coletamos</h3>
            <p style={{ margin: 0 }}>Coletamos apenas os dados necessários para o funcionamento do serviço:</p>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li><strong style={{ color: 'var(--text)' }}>E-mail</strong> — usado para autenticação e recuperação de conta.</li>
              <li><strong style={{ color: 'var(--text)' }}>Dados financeiros</strong> — transações, categorias, projetos e cartões que você mesmo cadastra para uso do aplicativo.</li>
            </ul>
            <p style={{ margin: 0 }}>Não coletamos nome, CPF, dados bancários reais ou qualquer informação além do que você insere diretamente.</p>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h3 style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', margin: 0 }}>2. Como usamos seus dados</h3>
            <p style={{ margin: 0 }}>Seus dados são usados exclusivamente para:</p>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li>Exibir seu histórico e relatórios financeiros.</li>
              <li>Permitir acesso ao aplicativo em qualquer dispositivo.</li>
            </ul>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h3 style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', margin: 0 }}>3. Compartilhamento de dados</h3>
            <p style={{ margin: 0 }}><strong style={{ color: 'var(--text)' }}>Seus dados não são vendidos, alugados ou compartilhados com terceiros.</strong></p>
            <p style={{ margin: 0 }}>
              <strong style={{ color: 'var(--text)' }}>Exceção — Assistente de IA (opcional):</strong> se você optar por ativar o assistente financeiro, um resumo agregado dos seus dados do mês (totais de entradas, saídas e categorias) é enviado à Groq para processamento pelo modelo Llama 3.3. Nenhum dado pessoal identificável é transmitido. Essa função é desativada por padrão e pode ser desligada a qualquer momento.
            </p>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h3 style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', margin: 0 }}>4. Armazenamento e segurança</h3>
            <p style={{ margin: 0 }}>Todos os dados são armazenados no Supabase, plataforma com criptografia em trânsito (TLS) e em repouso. O acesso é restrito por autenticação e cada usuário acessa apenas seus próprios dados (Row Level Security).</p>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h3 style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', margin: 0 }}>5. Seus direitos (LGPD)</h3>
            <p style={{ margin: 0 }}>Em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018), você tem direito a:</p>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li>Acessar todos os dados cadastrados a qualquer momento.</li>
              <li><strong style={{ color: 'var(--text)' }}>Deletar sua conta e todos os seus dados permanentemente</strong> — disponível em Configurações → Deletar conta.</li>
              <li>Revogar o consentimento do assistente de IA a qualquer momento em Configurações.</li>
            </ul>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h3 style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', margin: 0 }}>6. Contato</h3>
            <p style={{ margin: 0 }}>Para dúvidas sobre privacidade, solicitação ou exportação de dados, entre em contato pelo e-mail: <a href="mailto:rorodrigo012007@gmail.com" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>rorodrigo012007@gmail.com</a></p>
          </section>
        </div>

        {onClose && (
          <div className="modal-actions">
            <button className="btn primary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
              Entendi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
