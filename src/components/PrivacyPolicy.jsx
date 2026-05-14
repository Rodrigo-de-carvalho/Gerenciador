import { X, Shield } from 'lucide-react';

export default function PrivacyPolicy({ onClose }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            <h2 className="font-bold text-slate-800 dark:text-slate-100 text-base">Política de Privacidade</h2>
          </div>
          {onClose && (
            <button className="btn-icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <p className="text-xs text-slate-400 dark:text-slate-500">Última atualização: maio de 2025</p>

          <section>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">1. Dados que coletamos</h3>
            <p>Coletamos apenas os dados necessários para o funcionamento do serviço:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-500 dark:text-slate-400">
              <li><strong className="text-slate-700 dark:text-slate-200">E-mail</strong> — usado para autenticação e recuperação de conta.</li>
              <li><strong className="text-slate-700 dark:text-slate-200">Dados financeiros</strong> — transações, categorias, projetos e cartões que você mesmo cadastra para uso do aplicativo.</li>
            </ul>
            <p className="mt-2">Não coletamos nome, CPF, dados bancários reais ou qualquer informação além do que você insere diretamente.</p>
          </section>

          <section>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">2. Como usamos seus dados</h3>
            <p>Seus dados são usados exclusivamente para:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-500 dark:text-slate-400">
              <li>Exibir seu histórico e relatórios financeiros.</li>
              <li>Permitir acesso ao aplicativo em qualquer dispositivo.</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">3. Compartilhamento de dados</h3>
            <p>
              <strong>Seus dados não são vendidos, alugados ou compartilhados com terceiros.</strong>
            </p>
            <p className="mt-2">
              <strong>Exceção — Assistente de IA (opcional):</strong> se você optar por ativar o assistente financeiro, um resumo agregado dos seus dados do mês (totais de entradas, saídas e categorias) é enviado à <a href="https://groq.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Groq</a> para processamento pelo modelo Llama 3.3. Nenhum dado pessoal identificável é transmitido. Essa função é desativada por padrão e pode ser desligada a qualquer momento.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">4. Armazenamento e segurança</h3>
            <p>
              Todos os dados são armazenados no <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Supabase</a>, plataforma com criptografia em trânsito (TLS) e em repouso. O acesso é restrito por autenticação e cada usuário acessa apenas seus próprios dados (Row Level Security).
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">5. Seus direitos (LGPD)</h3>
            <p>Em conformidade com a Lei Geral de Proteção de Dados (Lei 13.709/2018), você tem direito a:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-500 dark:text-slate-400">
              <li>Acessar todos os dados cadastrados a qualquer momento.</li>
              <li><strong className="text-slate-700 dark:text-slate-200">Deletar sua conta e todos os seus dados permanentemente</strong> — disponível em Configurações → Deletar conta.</li>
              <li>Revogar o consentimento do assistente de IA a qualquer momento em Configurações.</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">6. Contato</h3>
            <p>Dúvidas sobre privacidade podem ser enviadas pelo repositório do projeto no GitHub.</p>
          </section>
        </div>

        {onClose && (
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex-shrink-0">
            <button className="btn-primary w-full justify-center" onClick={onClose}>
              Entendi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
