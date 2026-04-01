# matcher.py
# Placeholder for now — will be built in Checkpoint 3.
# The plan: use OpenAI embeddings to semantically match
# requirements against vendor proposals.

def simple_match(requirement: str, proposal_text: str) -> str:
    """
    Very basic check — is the requirement keyword literally in the proposal?
    This is a placeholder. Real semantic matching comes later.
    """
    if requirement.lower() in proposal_text.lower():
        return "FOUND"
    return "NOT FOUND"