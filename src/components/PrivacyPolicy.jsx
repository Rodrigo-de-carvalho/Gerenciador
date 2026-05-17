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
          <p style={{ fontSize: 11.5, color: 'var(--text-4)', margin: 0 }}>Última atualização: maio de 2026</p>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h3 style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', margin: 0 }}>1. Dados que coletamos</h3>
            <p style={{ margin: 0 }}>Coletamos apenas os dados necessários para o funcionamento do serviço:</p>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li><strong style={{ color: 'var(--text)' }}>E-mail</strong> — usado para autenticação e recuperação de conta.</li>
              <li><strong style={{ color: 'var(--text)' }}>Dados financeiros</strong> — transações, categorias, projetos, cartões, metas, investimentos e orçamentos que você mesmo cadastra para uso do aplicativo.</li>
            </ul>
            <p style={{ margin: 0 }}>Não coletamos nome, CPF, dados bancários reais ou qualquer informação além do que você insere diretamente.</p>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h3 style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', margin: 0 }}>2. Base legal (LGPD — Art. 7º)</h3>
            <p style={{ margin: 0 }}>O tratamento dos seus dados é realizado com base no seu <strong style={{ color: 'var(--text)' }}>consentimento expresso</strong> (Art. 7º, I) concedido ao aceitar estes termos, e na <strong style={{ color: 'var(--text)' }}>execução do contrato</strong> de uso do serviço (Art. 7º, V) — sem o qual não é possível fornecer as funcionalidades do aplicativo.</p>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h3 style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', margin: 0 }}>3. Como usamos seus dados</h3>
            <p style={{ margin: 0 }}>Seus dados são usados exclusivamente para:</p>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li>Exibir seu histórico e relatórios financeiros.</li>
              <li>Permitir acesso ao aplicativo em qualquer dispositivo.</li>
            </ul>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h3 style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', margin: 0 }}>4. Compartilhamento de dados</h3>
            <p style={{ margin: 0 }}><strong style={{ color: 'var(--text)' }}>Seus dados não são vendidos, alugados ou compartilhados com terceiros.</strong></p>
            <p style={{ margin: 0 }}>
              <strong style={{ color: 'var(--text)' }}>Exceção — Assistente de IA (opcional):</strong> se você optar por ativar o assistente financeiro, um resumo agregado dos seus dados do mês (totais de entradas, saídas e categorias) é enviado à Groq para processamento pelo modelo Llama 3.3. Nenhum dado pessoal identificável é transmitido. Essa função é desativada por padrão e pode ser desligada a qualquer momento em Configurações.
            </p>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h3 style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', margin: 0 }}>5. Armazenamento e segurança</h3>
            <p style={{ margin: 0 }}>Todos os dados são armazenados no Supabase, plataforma com criptografia em trânsito (TLS) e em repouso. O acesso é restrito por autenticação e cada usuário acessa apenas seus próprios dados (Row Level Security).</p>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h3 style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', margin: 0 }}>6. Retenção de dados</h3>
            <p style={{ margin: 0 }}>Seus dados são mantidos enquanto sua conta estiver ativa. Ao solicitar a exclusão da conta, <strong style={{ color: 'var(--text)' }}>todos os seus dados são removidos permanentemente</strong> — incluindo transações, categorias, projetos, cartões, metas, investimentos e orçamentos — em até 30 dias. Não há retenção de dados financeiros após a exclusão.</p>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h3 style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', margin: 0 }}>7. Seus direitos (LGPD — Art. 18)</h3>
            <p style={{ margin: 0 }}>Em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018), você tem direito a:</p>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li><strong style={{ color: 'var(--text)' }}>Acesso</strong> — visualize todos os seus dados a qualquer momento dentro do app.</li>
              <li><strong style={{ color: 'var(--text)' }}>Portabilidade</strong> — exporte seus dados em formato JSON via Configurações → Exportar dados.</li>
              <li><strong style={{ color: 'var(--text)' }}>Exclusão</strong> — delete sua conta e todos os dados permanentemente em Configurações → Deletar conta.</li>
              <li><strong style={{ color: 'var(--text)' }}>Revogação do consentimento</strong> — desative o assistente de IA a qualquer momento em Configurações.</li>
              <li><strong style={{ color: 'var(--text)' }}>Informação</strong> — solicite esclarecimentos sobre o tratamento dos seus dados pelo canal de contato abaixo.</li>
            </ul>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h3 style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', margin: 0 }}>8. Encarregado de Proteção de Dados (DPO)</h3>
            <p style={{ margin: 0 }}>Em atendimento ao Art. 41 da LGPD, o responsável pelo tratamento de dados pessoais e canal para exercício dos seus direitos é:</p>
            <p style={{ margin: 0 }}><strong style={{ color: 'var(--text)' }}>Rodrigo de Carvalho</strong><br />E-mail: <a href="mailto:rorodrigo012007@gmail.com" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>rorodrigo012007@gmail.com</a></p>
            <p style={{ margin: 0 }}>Solicitações de acesso, correção, portabilidade ou exclusão de dados serão respondidas em até 15 dias.</p>
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
