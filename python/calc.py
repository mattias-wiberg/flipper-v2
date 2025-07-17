import numpy as np

# Costs from Normal, Good, Outstanding, Excellent
cost_vector = np.array([4.4, 5.5, 6.6, 27.5])  

# 1=Normal, 2=Good, 3=Outstanding, 4=Excellent, 5=Masterpiece
qualities = [1, 2, 3, 4, 5]
# Transition matrix in canonical form
P = np.array([
    # Transition probabilities
    # 1,   2,     3,     4,       5
    [0,    0.8,   0.15,  0.049,   0.001],  # 1
    [0,    0.3,   0.6,   0.099,   0.001],  # 2
    [0,    0,     0.5,   0.499,   0.001],  # 3
    [0,    0,     0,     0.995,   0.005],  # 4
    [0,    0,     0,     0,       1]       # 5
])
expected_cost_vectors = []


for i in range(4):
    # Extract Q (transient states: Normal, Good, Outstanding, Excellent)
    Q = P[:4-i, :4-i]

    # Identity matrix
    I = np.eye(Q.shape[0])

    # Fundamental matrix N = (I - Q)^(-1)
    N = np.linalg.inv(I - Q)

    # Expected total cost from each transient state
    expected_costs = N @ cost_vector

    print('Cost of going to atleast', qualities[4-i], 'from')
    print(qualities[:4-i])
    print(expected_costs)
    expected_cost_vectors.append(expected_costs.tolist())
    # Sum the last column into the second to last column
    P[:, -2] += P[:, -1]
    P = P[:-1, :-1]  # Remove the last row and column
    cost_vector = cost_vector[:-1]  # Remove last cost

expected_cost_vectors.reverse()
print("Expected cost vectors")
print(expected_cost_vectors)

def expected_quality_upgrade_cost(from_quality: int, to_quality: int, item_value: int = 1) -> float:
    """
    Calculate the expected cost to upgrade an item from one quality level to another.

    :param from_quality: The current quality level (1=Normal, 2=Good, 3=Outstanding, 4=Excellent, 5=Masterpiece).
    :param to_quality: The target quality level (1=Normal, 2=Good, 3=Outstanding, 4=Excellent, 5=Masterpiece).
    :param item_value: The value of the item being upgraded.
    :return: The expected cost to upgrade.
    """
    if from_quality < 1 or from_quality > 5 or to_quality < 1 or to_quality > 5:
        raise ValueError("Quality levels must be between 1 and 5.")

    if from_quality >= to_quality:
        return 0.0

    return expected_cost_vectors[to_quality-2][from_quality - 1] * item_value

assert expected_quality_upgrade_cost(1, 2) == expected_cost_vectors[0][0]
assert expected_quality_upgrade_cost(1, 3) == expected_cost_vectors[1][0]
assert expected_quality_upgrade_cost(2, 3) == expected_cost_vectors[1][1]
assert expected_quality_upgrade_cost(1, 4) == expected_cost_vectors[2][0]
assert expected_quality_upgrade_cost(2, 4) == expected_cost_vectors[2][1]
assert expected_quality_upgrade_cost(3, 4) == expected_cost_vectors[2][2]
assert expected_quality_upgrade_cost(1, 5) == expected_cost_vectors[3][0]
assert expected_quality_upgrade_cost(2, 5) == expected_cost_vectors[3][1]
assert expected_quality_upgrade_cost(3, 5) == expected_cost_vectors[3][2]
assert expected_quality_upgrade_cost(4, 5) == expected_cost_vectors[3][3]
assert expected_quality_upgrade_cost(4, 3) == 0.0
try:
    expected_quality_upgrade_cost(0, 2)
    expected_quality_upgrade_cost(0, 6)
    assert False, "Expected ValueError"
except ValueError:
    pass
