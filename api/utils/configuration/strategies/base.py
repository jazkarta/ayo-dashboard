from abc import ABC, abstractmethod
from typing import Optional


class EmailConfigurationStrategy(ABC):
    @abstractmethod
    def get_config(self) -> Optional[dict]:
        raise NotImplementedError
