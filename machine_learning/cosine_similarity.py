"""
Dense Cosine Similarity for IoT RAG vector embedding comparison.

Used to compute the similarity score between query embeddings and SOP document
chunk embeddings in the Qdrant-backed RAG system (multilingual-e5-large, 1024D).

Formula:
    Cosine(u, v) = (u · v) / (||u||_2 * ||v||_2)
"""

import math
from typing import Any, Dict, List


def calculate_cosine_similarity(
    v1: List[float],
    v2: List[float],
) -> Dict[str, Any]:
    """Computes Cosine Similarity between two dense numerical vectors.

    Formula:
        S_c(u, v) = (u · v) / (||u||_2 · ||v||_2)

    Args:
        v1: Query embedding vector (e.g. 1024D from multilingual-e5-large).
        v2: Document chunk embedding vector of equal dimension.

    Returns:
        Dict with keys: dot_product, norm_v1, norm_v2, similarity ∈ [-1, 1],
        similarity_percentage, formula_latex.
        On dimension mismatch: returns an error key with similarity=0.0.

    Example:
        >>> result = calculate_cosine_similarity([1.0, 0.0], [0.0, 1.0])
        >>> result["similarity"]
        0.0
        >>> result = calculate_cosine_similarity([1.0, 1.0], [1.0, 1.0])
        >>> result["similarity"]
        1.0
    """
    if len(v1) != len(v2) or len(v1) == 0:
        return {
            "error": "Vectors must be of equal, non-zero length",
            "similarity": 0.0,
            "similarity_percentage": 0.0,
        }

    dot_product = sum(a * b for a, b in zip(v1, v2))
    norm_v1 = math.sqrt(sum(a * a for a in v1))
    norm_v2 = math.sqrt(sum(b * b for b in v2))

    if norm_v1 == 0.0 or norm_v2 == 0.0:
        cosine_sim = 0.0
    else:
        cosine_sim = dot_product / (norm_v1 * norm_v2)

    return {
        "dot_product": round(dot_product, 4),
        "norm_v1": round(norm_v1, 4),
        "norm_v2": round(norm_v2, 4),
        "similarity": round(cosine_sim, 4),
        "similarity_percentage": round(cosine_sim * 100, 2),
        "formula_latex": (
            r"S_c(u, v) = \frac{\mathbf{u} \cdot \mathbf{v}}"
            r"{\|\mathbf{u}\|_2 \|\mathbf{v}\|_2}"
        ),
    }
