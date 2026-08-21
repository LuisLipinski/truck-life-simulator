export const CAREERS_KEY = 'ats_careers_v1'
export const ACTIVE_CAREER_KEY = 'ats_active_career'

export function loadCareers() {
  try {
    const value = JSON.parse(localStorage.getItem(CAREERS_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

export function saveCareers(careers) {
  localStorage.setItem(CAREERS_KEY, JSON.stringify(careers))
}

export function getCareer(id) {
  return loadCareers().find((career) => career.id === id) || null
}

export function createCareer(input) {
  const careers = loadCareers()
  const career = {
    id: `career_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    currentLevel: 1,
    ...input,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  careers.push(career)
  saveCareers(careers)
  localStorage.setItem(ACTIVE_CAREER_KEY, career.id)
  return career
}

export function deleteCareer(id) {
  saveCareers(loadCareers().filter((career) => career.id !== id))
  if (localStorage.getItem(ACTIVE_CAREER_KEY) === id) {
    localStorage.removeItem(ACTIVE_CAREER_KEY)
  }
}

export function setActiveCareer(id) {
  localStorage.setItem(ACTIVE_CAREER_KEY, id)
}

export function getActiveCareerId() {
  return localStorage.getItem(ACTIVE_CAREER_KEY)
}
