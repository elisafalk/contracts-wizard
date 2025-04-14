import type { ContractBuilder } from './contract';
import type { Access } from './set-access-control';
import { requireAccessControl } from './set-access-control';
import { defineFunctions } from './utils/define-functions';

export const upgradeableOptions = [false, 'transparent', 'uups'] as const;

export type Upgradeable = (typeof upgradeableOptions)[number];

export function setUpgradeable(c: ContractBuilder, upgradeable: Upgradeable, access: Access) {
  if (upgradeable === false) {
    return;
  }

  c.upgradeable = true;

  c.addParent({
    name: 'Initializable',
    path: '@openzeppelin/contracts/proxy/utils/Initializable.sol',
  });

  switch (upgradeable) {
    case 'transparent':
      break;

    case 'uups': {
      const UUPSUpgradeable = {
        name: 'UUPSUpgradeable',
        path: '@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol',
      };
      c.addParent(UUPSUpgradeable);
      c.addOverride(UUPSUpgradeable, functions._authorizeUpgrade);
      
      // Check if the contract is a Governor contract
      const isGovernor = c.parents.some(p => 
        p.contract.name === 'Governor' || 
        p.contract.name === 'GovernorUpgradeable'
      );
      
      if (isGovernor) {
        // Use onlyGovernance for Governor contracts
        c.addModifier('onlyGovernance', functions._authorizeUpgrade);
      } else {
        // Use the standard access control for other contracts
        requireAccessControl(c, functions._authorizeUpgrade, access, 'UPGRADER', 'upgrader');
      }
      
      c.setFunctionBody([], functions._authorizeUpgrade);
      break;
    }

    default: {
      const _: never = upgradeable;
      throw new Error('Unknown value for `upgradeable`');
    }
  }
}

const functions = defineFunctions({
  _authorizeUpgrade: {
    args: [{ name: 'newImplementation', type: 'address' }],
    kind: 'internal',
  },
});
