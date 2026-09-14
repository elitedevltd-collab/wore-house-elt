import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useUI } from '../context/UIContext';
import { Table } from '../components/ui';

export function AuditPage() {
  const { t } = useUI();
  const { data: logs } = useQuery({ queryKey: ['audit'], queryFn: async () => (await api.get('/audit')).data });

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">{t('سجل التدقيق', 'Audit log')}</h1>
      <Table headers={[t('التاريخ', 'Date'), t('المستخدم', 'User'), t('الإجراء', 'Action'), t('الكيان', 'Entity')]}>
        {logs?.map((l: any) => (
          <tr key={l.id}>
            <td className="px-4 py-3 text-gray-500">{new Date(l.createdAt).toLocaleString()}</td>
            <td className="px-4 py-3">{l.user ? `${l.user.firstName} ${l.user.lastName}` : '-'}</td>
            <td className="px-4 py-3">{l.action}</td>
            <td className="px-4 py-3 text-gray-500">{l.entityType}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
