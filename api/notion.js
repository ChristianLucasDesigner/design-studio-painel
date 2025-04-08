// API Route para o Notion
const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Tratar requisição OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    switch (req.method) {
      case 'GET':
        // Buscar pedidos
        const response = await fetch(`https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${NOTION_API_KEY}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sorts: [{ property: 'Data', direction: 'descending' }]
          })
        });

        const data = await response.json();
        
        // Formatar dados
        const orders = data.results.map(page => ({
          id: page.id,
          title: page.properties.Nome?.title[0]?.plain_text || 'Sem título',
          package: page.properties.Pacote?.select?.name || 'Não especificado',
          price: page.properties.Preço?.number || 0,
          status: page.properties.Status?.select?.name || 'Pendente',
          date: page.properties.Data?.date?.start || new Date().toISOString(),
          client: page.properties.Cliente?.rich_text[0]?.plain_text || 'Não informado',
          email: page.properties.Email?.email || 'Não informado',
          phone: page.properties.Telefone?.phone_number || 'Não informado'
        }));

        res.status(200).json(orders);
        break;

      case 'PATCH':
        // Atualizar status do pedido
        const { orderId, status } = req.body;
        
        const updateResponse = await fetch(`https://api.notion.com/v1/pages/${orderId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${NOTION_API_KEY}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            properties: {
              Status: {
                select: {
                  name: status
                }
              }
            }
          })
        });

        if (!updateResponse.ok) {
          throw new Error('Erro ao atualizar status');
        }

        res.status(200).json({ success: true });
        break;

      default:
        res.setHeader('Allow', ['GET', 'PATCH']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Erro na API:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
} 