export function createHomeAssistant(config) {
  return {
    async states() {
      if (!config.baseUrl || !config.token || !config.entities.length) return { state: 'disabled', entities: [] };
      try {
        const entities = await Promise.all(config.entities.map(async id => {
          const response = await fetch(`${config.baseUrl}/api/states/${encodeURIComponent(id)}`, {
            headers: { Authorization: `Bearer ${config.token}` }, signal: AbortSignal.timeout(5000)
          });
          if (!response.ok) throw new Error();
          const data = await response.json();
          return { id, name: data.attributes?.friendly_name || id, state: data.state, unit: data.attributes?.unit_of_measurement || '' };
        }));
        return { state: 'online', entities };
      } catch { return { state: 'offline', entities: [] }; }
    }
  };
}
