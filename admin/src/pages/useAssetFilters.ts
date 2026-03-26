import { useState, useEffect, useRef, useCallback } from 'react'

export interface AssetFilters {
  filterCategory: string
  setFilterCategory: (cat: string) => void
  searchInput: string
  setSearchInput: (val: string) => void
  searchTerm: string
  tagFilter: string
  setTagFilter: (val: string) => void
  page: number
  setPage: React.Dispatch<React.SetStateAction<number>>
  pageSize: number
  totalPages: number
  total: number
  setTotal: (n: number) => void
}

export function useAssetFilters(): AssetFilters {
  const [filterCategory, setFilterCategoryRaw] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(50)
  const [total, setTotal] = useState(0)

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      setSearchTerm(searchInput)
      setPage(1)
    }, 300)
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current) }
  }, [searchInput])

  const setFilterCategory = useCallback((cat: string) => {
    setFilterCategoryRaw(cat)
    setPage(1)
  }, [])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return {
    filterCategory,
    setFilterCategory,
    searchInput,
    setSearchInput,
    searchTerm,
    tagFilter,
    setTagFilter,
    page,
    setPage,
    pageSize,
    totalPages,
    total,
    setTotal,
  }
}
