// Aligned allocation for the large tables.
#pragma once
#include <cstddef>
#include <cstdlib>
#include <cstring>
#ifdef _WIN32
#include <malloc.h>
#endif
#if defined(__linux__)
#include <sys/mman.h>
#endif

namespace jq {
inline void* aligned_allocate(std::size_t align, std::size_t bytes) {
#ifdef _WIN32
    return _aligned_malloc(bytes, align);
#elif defined(__ANDROID__)
    void* p = nullptr;
    return posix_memalign(&p, align, bytes) == 0 ? p : nullptr;
#else
    return std::aligned_alloc(align, bytes);
#endif
}
inline void aligned_release(void* p) {
#ifdef _WIN32
    _aligned_free(p);
#else
    std::free(p);
#endif
}


// Zeroed block of at least `bytes`, aligned to 64. A block of half a megabyte or more is aligned to 2 MB, padded to a
// multiple of 2 MB and offered to the kernel as transparent huge pages (Linux keeps them in "madvise" mode by
// default): a probe into a table of hundreds of megabytes then costs a cache miss, not a cache miss plus a page walk.
// Release with std::free.
inline void* alloc_large(std::size_t bytes) {
    constexpr std::size_t HUGE_BYTES = std::size_t(2) << 20;
    const bool big = bytes >= HUGE_BYTES / 4;
    const std::size_t align = big ? HUGE_BYTES : 64;
    const std::size_t size = ((bytes ? bytes : 1) + align - 1) / align * align;
    void* p = aligned_allocate(align, size);
    if (!p) return nullptr;
#if defined(__linux__) && defined(MADV_HUGEPAGE)
    if (big) madvise(p, size, MADV_HUGEPAGE);
#endif
    std::memset(p, 0, size);
    return p;
}

}  // namespace jq
