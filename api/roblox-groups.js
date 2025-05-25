function turkceTarihFarki(isoTarih) {
  const olusturma = new Date(isoTarih);
  const simdi = new Date();
  const farkMs = simdi - olusturma;

  const gun = Math.floor(farkMs / (1000 * 60 * 60 * 24));
  const ay = Math.floor(gun / 30);
  const yil = Math.floor(gun / 365);

  if (gun < 1) return "Bugün oluşturuldu";
  if (gun < 30) return `${gun} gün önce oluşturuldu`;
  if (ay < 12) return `${ay} ay önce oluşturuldu`;
  return `${yil} yıl önce oluşturuldu`;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Sadece GET destekleniyor." });
    return;
  }

  const { username } = req.query;
  if (!username) {
    res.status(400).json({ error: "Lütfen ?username=kullaniciadi şeklinde sorgula." });
    return;
  }

  // Kullanıcı bilgileri
  let userId = null;
  let isBanned = null;
  let createdDate = null;
  try {
    const userRes = await fetch("https://users.roblox.com/v1/usernames/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
    });
    if (!userRes.ok) throw new Error("Kullanıcı info çekilemedi!");
    const userData = await userRes.json();
    if (userData?.data && userData.data.length > 0) {
      userId = userData.data[0].id;
      isBanned = userData.data[0].isBanned;
    }
  } catch (e) {
    return res.status(500).json({ error: "Kullanıcı ID alınamadı." });
  }

  if (!userId) {
    return res.status(404).json({ error: "Kullanıcı bulunamadı." });
  }

  // Kullanıcının oluşturulma tarihi
  try {
    const userDetailRes = await fetch(`https://users.roblox.com/v1/users/${userId}`);
    if (!userDetailRes.ok) throw new Error("Kullanıcı detayları çekilemedi!");
    const userDetailData = await userDetailRes.json();
    createdDate = userDetailData.created;
  } catch (e) {
    return res.status(500).json({ error: "Kullanıcı tarihi alınamadı." });
  }

  // Grup bilgileri
  let groupData = null;
  try {
    const groupRes = await fetch(`https://groups.roblox.com/v2/users/${userId}/groups/roles`, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept-Encoding": "gzip, deflate"
      }
    });
    if (!groupRes.ok) throw new Error("Grup verisi çekilemedi!");
    groupData = await groupRes.json();
  } catch (e) {
    return res.status(500).json({ error: "Grup verisi alınamadı." });
  }

  if (!groupData || !groupData.data) {
    return res.status(404).json({ error: "Grup verisi bulunamadı." });
  }

  const groupsList = groupData.data.map(item => ({
    group_name: item.group?.name || "Bilinmiyor",
    role_name: item.role?.name || "Bilinmiyor"
  }));

  return res.status(200).json({
    user_id: userId,
    username,
    profile_link: `https://www.roblox.com/users/${userId}/profile`,
    group_count: groupsList.length,
    is_banned: isBanned,
    created_text: createdDate ? turkceTarihFarki(createdDate) : null,
    groups: groupsList
  });
    }
